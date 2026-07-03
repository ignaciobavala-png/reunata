'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getMPPreference, isSandbox } from '@/lib/mercadopago'
import { aplicarTipoCambio } from '@/lib/utils'
import { revalidatePath } from 'next/cache'
import { cotizarEnvio } from '@/lib/enviopack'
import { stockDisponible } from '@/lib/stock'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

interface CheckoutItem {
  productoId: number
  cantidad: number
  variante?: string
}

interface GuestData {
  nombre: string
  email: string
  telefono?: string
}

interface EnvioParams {
  provincia: string
  codigo_postal: string
  servicioId: string
  calle: string
  numero: string
  piso?: string
}

// Datos de envío resueltos server-side (nunca del cliente)
interface EnvioResuelto {
  descripcion: string
  costo: number
}

export async function iniciarCheckoutMP(
  items: CheckoutItem[],
  guestData?: GuestData,
  envioParams?: EnvioParams,
  telefono?: string,
): Promise<{ ok: boolean; init_point?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const service = createServiceClient()

  // Resolver canal del usuario (necesario para múltiplos, config del canal y validar método de pago)
  let canalId: number | null = null
  if (user) {
    const { data: profileCanal } = await supabase
      .from('profiles')
      .select('canal_id, telefono')
      .eq('id', user.id)
      .single()
    canalId = profileCanal?.canal_id ?? null

    // Solo canales minoristas pueden pagar con MP
    const { data: canalRow } = await service
      .from('canales')
      .select('categoria_comercial')
      .eq('id', canalId ?? 0)
      .maybeSingle()

    if (canalRow?.categoria_comercial !== 'minorista') {
      return { ok: false, error: 'Este método de pago es solo para minoristas.' }
    }

    // WhatsApp obligatorio: sin él no podríamos avisar por faltantes de stock.
    // Se acepta el que venga del carrito y se persiste en el perfil si cambió.
    const telefonoActual = (profileCanal?.telefono as string | null) ?? null
    const telefonoFinal = telefono?.trim() || telefonoActual
    if (!telefonoFinal || telefonoFinal.replace(/\D/g, '').length < 8) {
      return { ok: false, error: 'Ingresá tu WhatsApp para continuar.' }
    }
    if (telefono?.trim() && telefono.trim() !== telefonoActual) {
      await service.from('profiles').update({ telefono: telefono.trim() }).eq('id', user.id)
    }
  } else {
    // Guest: requiere datos del comprador, incluido el WhatsApp
    if (!guestData?.nombre?.trim() || !guestData?.email?.trim()) {
      return { ok: false, error: 'Completá tu nombre y email para continuar.' }
    }
    if (!guestData?.telefono?.trim() || guestData.telefono.replace(/\D/g, '').length < 8) {
      return { ok: false, error: 'Ingresá tu WhatsApp para continuar.' }
    }
    // Guests operan como consumidor_final
    const { data: cfCanal } = await service
      .from('canales')
      .select('id')
      .eq('slug', 'consumidor_final')
      .single()
    canalId = cfCanal?.id ?? null
  }

  // Validar múltiplos — aplica tanto a usuarios registrados como a guests
  let productoCanalDb: { producto_id: number; multiplo: number | null }[] | null = null
  if (canalId) {
    const { data } = await service
      .from('producto_canales')
      .select('producto_id, multiplo')
      .eq('canal_id', canalId)
      .in('producto_id', items.map(i => i.productoId))
    productoCanalDb = data

    for (const item of items) {
      const row = productoCanalDb?.find(r => r.producto_id === item.productoId)
      const multiplo = row?.multiplo ?? 1
      if (multiplo > 1 && item.cantidad % multiplo !== 0) {
        const { data: prod } = await service.from('productos').select('titulo').eq('id', item.productoId).single()
        const nombre = prod?.titulo ? `"${prod.titulo}"` : 'Un producto'
        return { ok: false, error: `${nombre} debe comprarse en múltiplos de ${multiplo} unidades.` }
      }
    }
  }

  const [{ data: productos }, { data: tcRow }, { data: canalCfg }] = await Promise.all([
    service
      .from('productos')
      .select('id, titulo, precio_lista5, moneda, stock, variantes, iva')
      .in('id', items.map(i => i.productoId))
      .eq('activo', true),
    service
      .from('configuracion')
      .select('valor')
      .eq('clave', 'tipo_cambio_usd')
      .maybeSingle(),
    canalId
      ? service
          .from('canales_config')
          .select('cuotas_mp_sin_interes, minimo_compra, dias_vencimiento_pedido, envio_gratis_desde, envio_amba_gratis_desde, desc_volumen_monto_min, desc_volumen_pct')
          .eq('canal_id', canalId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  if (!productos?.length) return { ok: false, error: 'Productos no disponibles.' }

  for (const item of items) {
    const prod = productos.find(p => p.id === item.productoId)
    if (prod) {
      const disponible = stockDisponible(prod, item.variante)
      if (disponible !== null && disponible < item.cantidad) {
        return { ok: false, error: `"${prod.titulo}" ingresa próximamente. Reducí la cantidad para continuar.` }
      }
    }
  }

  const tipoCambioUsd = parseFloat(tcRow?.valor ?? '1') || 1

  const lineas = items.flatMap(item => {
    const prod = productos.find(p => p.id === item.productoId)
    if (!prod || prod.precio_lista5 == null) return []
    const { precio: precioArs } = aplicarTipoCambio(prod.precio_lista5, prod.moneda ?? null, tipoCambioUsd)
    if (precioArs === null) return []
    // El checkout MP es solo para consumidor_final → aplicar IVA al precio neto
    const ivaRate = ((prod.iva as number | null) ?? 21) / 100
    const precioConIva = Math.round(precioArs * (1 + ivaRate))
    return [{ productoId: item.productoId, titulo: prod.titulo, cantidad: item.cantidad, precioUnit: precioConIva, ivaRate, variante: item.variante ?? null }]
  })

  if (lineas.length === 0) return { ok: false, error: 'Ningún producto tiene precio configurado.' }
  // Nunca crear el pedido con menos ítems de los que el usuario ve en su carrito:
  // si un producto se desactivó o quedó sin precio, se rechaza todo el checkout.
  if (lineas.length !== items.length) {
    return { ok: false, error: 'Algunos productos de tu carrito ya no están disponibles. Quitalos del carrito para continuar.' }
  }

  // Re-cotizar envío server-side — nunca confiar en el precio del cliente (fix #3)
  let envio: EnvioResuelto | undefined
  if (envioParams) {
    const { opciones, error: envioError } = await cotizarEnvio({
      items,
      codigo_postal: envioParams.codigo_postal,
      provincia: envioParams.provincia,
    })
    const opcion = opciones.find(o => o.id === envioParams.servicioId)
    if (envioError || !opcion) {
      return { ok: false, error: 'No se pudo verificar el costo de envío. Recalculá antes de continuar.' }
    }
    envio = { descripcion: opcion.descripcion, costo: opcion.costo }
  }

  const subtotal = lineas.reduce((acc, l) => acc + l.precioUnit * l.cantidad, 0)
  // Precio Bruto por línea con la misma fórmula que el cliente (round(precio / (1 + iva)))
  const subtotalBrutoMP = lineas.reduce((acc, l) => acc + Math.round(l.precioUnit / (1 + l.ivaRate)) * l.cantidad, 0)

  // Descuento por volumen del canal — umbral y monto sobre el Precio Bruto (sin IVA);
  // se pliega por línea porque MP no admite unit_price negativo.
  const volMinMP = (canalCfg?.desc_volumen_monto_min as number | null) ?? null
  const volPctMP = (canalCfg?.desc_volumen_pct as number | null) ?? null
  const aplicaVolumenCanalMP = volMinMP !== null && volPctMP != null && volPctMP > 0 && subtotalBrutoMP >= volMinMP
  const lineasFinales = lineas.map(l => {
    const totalLinea = l.precioUnit * l.cantidad
    const brutoLinea = Math.round(l.precioUnit / (1 + l.ivaRate)) * l.cantidad
    const monto = aplicaVolumenCanalMP
      ? totalLinea - Math.round(brutoLinea * volPctMP / 100)
      : totalLinea
    return { ...l, monto }
  })
  const subtotalPostDescuento = lineasFinales.reduce((acc, l) => acc + l.monto, 0)

  // Validar mínimo de compra — sobre el subtotal ya con descuentos aplicados
  const minimoCompraMP = (canalCfg?.minimo_compra as number | null) ?? null
  if (minimoCompraMP && subtotalPostDescuento < minimoCompraMP) {
    return {
      ok: false,
      error: `El mínimo de compra es ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(minimoCompraMP)}.`,
    }
  }

  // Aplicar envío gratis si el canal lo tiene configurado y el monto (post-descuentos) alcanza
  if (envio && canalCfg) {
    const esAmba = ['B', 'C'].includes(envioParams!.provincia)
    const umbralAmba = canalCfg.envio_amba_gratis_desde as number | null
    const umbralGeneral = canalCfg.envio_gratis_desde as number | null
    if (
      (umbralAmba && esAmba && subtotalPostDescuento >= umbralAmba) ||
      (umbralGeneral && subtotalPostDescuento >= umbralGeneral)
    ) {
      envio = { descripcion: envio.descripcion, costo: 0 }
    }
  }

  const total = subtotalPostDescuento + (envio?.costo ?? 0)

  const diasVencimiento = (canalCfg?.dias_vencimiento_pedido as number | null) ?? 1
  const expiraEn = new Date(Date.now() + diasVencimiento * 24 * 60 * 60 * 1000).toISOString()

  // Cancelar pedidos pendiente_pago previos SOLO si van al mismo destino de envío:
  // eso es un reintento (usuario abandonó MP y volvió a intentar). Un pedido igual
  // pero a otra dirección (ej: la misma compra para otro local) se conserva.
  if (user) {
    let q = service
      .from('pedidos')
      .update({ estado: 'cancelado' })
      .eq('cliente_id', user.id)
      .eq('estado', 'pendiente_pago')
      .eq('medio_pago', 'mercadopago')
    q = envioParams
      ? q.eq('envio_codigo_postal', envioParams.codigo_postal).eq('envio_calle', envioParams.calle).eq('envio_numero', envioParams.numero)
      : q.is('envio_codigo_postal', null)
    await q
  } else if (guestData?.email) {
    let q = service
      .from('pedidos')
      .update({ estado: 'cancelado' })
      .eq('guest_email', guestData.email.trim().toLowerCase())
      .eq('estado', 'pendiente_pago')
      .eq('medio_pago', 'mercadopago')
    q = envioParams
      ? q.eq('envio_codigo_postal', envioParams.codigo_postal).eq('envio_calle', envioParams.calle).eq('envio_numero', envioParams.numero)
      : q.is('envio_codigo_postal', null)
    await q
  }

  const pedidoInsert: Record<string, unknown> = {
    estado: 'pendiente_pago',
    total_usd: total,
    medio_pago: 'mercadopago',
    expira_en: expiraEn,
    costo_envio: envio?.costo ?? null,
    envio_descripcion: envio?.descripcion ?? null,
    envio_codigo_postal: envioParams?.codigo_postal ?? null,
    envio_provincia: envioParams?.provincia ?? null,
    envio_calle: envioParams?.calle ?? null,
    envio_numero: envioParams?.numero ?? null,
    envio_piso: envioParams?.piso ?? null,
  }

  if (user) {
    pedidoInsert.cliente_id = user.id
  } else {
    pedidoInsert.guest_nombre   = guestData!.nombre.trim()
    pedidoInsert.guest_email    = guestData!.email.trim().toLowerCase()
    pedidoInsert.guest_telefono = guestData!.telefono?.trim() ?? null
  }

  const { data: pedido, error: pedidoError } = await service
    .from('pedidos')
    .insert(pedidoInsert)
    .select('id')
    .single()

  if (pedidoError || !pedido) {
    console.error('[checkout/mp] insert pedido:', pedidoError?.message)
    return { ok: false, error: 'Error al crear el pedido.' }
  }

  const { error: itemsError } = await service.from('pedido_items').insert(
    lineas.map(l => ({
      pedido_id: pedido.id,
      producto_id: l.productoId,
      cantidad: l.cantidad,
      precio_unit: l.precioUnit,
      variante: l.variante ?? null,
    }))
  )
  if (itemsError) {
    await service.from('pedidos').delete().eq('id', pedido.id)
    return { ok: false, error: 'Error al registrar los ítems del pedido.' }
  }

  const payerEmail = user?.email ?? guestData!.email.trim().toLowerCase()

  try {
    const preference = getMPPreference()
    const response = await preference.create({
      body: {
        items: [
          // Cada línea lleva su total ya descontado (volumen de producto + volumen
          // del canal) para que MP cobre exactamente el total del pedido.
          ...lineasFinales.map(l => ({
            id: String(l.productoId),
            title: l.titulo,
            quantity: 1,
            unit_price: l.monto,
            currency_id: 'ARS',
          })),
          ...(envio ? [{
            id: 'envio',
            title: envio.descripcion,
            quantity: 1,
            unit_price: envio.costo,
            currency_id: 'ARS',
          }] : []),
        ],
        payer: { email: payerEmail },
        payment_methods: {
          installments: (canalCfg?.cuotas_mp_sin_interes as number | null) ?? 1,
        },
        back_urls: {
          success: `${APP_URL}/checkout/exito`,
          failure: `${APP_URL}/checkout/fallo`,
          pending: `${APP_URL}/checkout/pendiente`,
        },
        auto_return: 'approved',
        external_reference: pedido.id,
        notification_url: `${APP_URL}/api/mp/webhook`,
        statement_descriptor: 'REUNATA',
      },
    })

    await service
      .from('pedidos')
      .update({ mp_preference_id: response.id })
      .eq('id', pedido.id)

    revalidatePath('/pedidos')

    const url = isSandbox() ? response.sandbox_init_point : response.init_point
    if (!url) {
      await service.from('pedidos').delete().eq('id', pedido.id)
      return { ok: false, error: 'No se pudo obtener la URL de pago.' }
    }

    return { ok: true, init_point: url }
  } catch (err) {
    await service.from('pedidos').delete().eq('id', pedido.id)
    console.error('[checkout/mp]', err instanceof Error ? err.message : String(err))
    return { ok: false, error: 'Error al conectar con Mercado Pago. Intentá de nuevo.' }
  }
}

// ── Checkout por Transferencia — solo consumidor_final autenticado ─────────
export async function iniciarCheckoutTransferencia(
  items: CheckoutItem[],
  envioParams?: EnvioParams,
  comprobantePath?: string,
  telefono?: string,
): Promise<{ ok: boolean; pedidoId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: 'Necesitás iniciar sesión para pagar por transferencia.' }

  const { data: perfil } = await supabase
    .from('profiles')
    .select('canal_id, telefono')
    .eq('id', user.id)
    .single()

  const canalId = perfil?.canal_id ?? null
  const service = createServiceClient()

  const { data: canalRow } = await service
    .from('canales')
    .select('categoria_comercial')
    .eq('id', canalId ?? 0)
    .maybeSingle()

  if (canalRow?.categoria_comercial !== 'minorista') {
    return { ok: false, error: 'Este método de pago es solo para minoristas.' }
  }

  // WhatsApp obligatorio (mismo criterio que MP): sin él no podríamos avisar por stock.
  const telefonoActual = (perfil?.telefono as string | null) ?? null
  const telefonoFinal = telefono?.trim() || telefonoActual
  if (!telefonoFinal || telefonoFinal.replace(/\D/g, '').length < 8) {
    return { ok: false, error: 'Ingresá tu WhatsApp para continuar.' }
  }
  if (telefono?.trim() && telefono.trim() !== telefonoActual) {
    await service.from('profiles').update({ telefono: telefono.trim() }).eq('id', user.id)
  }

  // Validar múltiplos
  let productoCanalDb: { producto_id: number; multiplo: number | null }[] | null = null
  if (canalId) {
    const { data } = await service
      .from('producto_canales')
      .select('producto_id, multiplo')
      .eq('canal_id', canalId)
      .in('producto_id', items.map(i => i.productoId))
    productoCanalDb = data

    for (const item of items) {
      const row = productoCanalDb?.find(r => r.producto_id === item.productoId)
      const multiplo = row?.multiplo ?? 1
      if (multiplo > 1 && item.cantidad % multiplo !== 0) {
        const { data: prod } = await service.from('productos').select('titulo').eq('id', item.productoId).single()
        const nombre = prod?.titulo ? `"${prod.titulo}"` : 'Un producto'
        return { ok: false, error: `${nombre} debe comprarse en múltiplos de ${multiplo} unidades.` }
      }
    }
  }

  const [{ data: productos }, { data: tcRow }, { data: canalCfg }] = await Promise.all([
    service
      .from('productos')
      .select('id, titulo, precio_lista5, moneda, stock, variantes, iva')
      .in('id', items.map(i => i.productoId))
      .eq('activo', true),
    service
      .from('configuracion')
      .select('valor')
      .eq('clave', 'tipo_cambio_usd')
      .maybeSingle(),
    canalId
      ? service
          .from('canales_config')
          .select('desc_transferencia_pct, minimo_compra, dias_vencimiento_pedido, envio_gratis_desde, envio_amba_gratis_desde, pagos_habilitados, desc_volumen_monto_min, desc_volumen_pct')
          .eq('canal_id', canalId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  // Verificar que transferencia esté habilitada para este canal
  const pagosHab = (canalCfg?.pagos_habilitados as Record<string, { activo: boolean }> | null) ?? {}
  if (!pagosHab['transferencia']?.activo) {
    return { ok: false, error: 'El método de transferencia no está disponible para tu cuenta.' }
  }

  if (!productos?.length) return { ok: false, error: 'Productos no disponibles.' }

  for (const item of items) {
    const prod = productos.find(p => p.id === item.productoId)
    if (prod) {
      const disponible = stockDisponible(prod, item.variante)
      if (disponible !== null && disponible < item.cantidad) {
        return { ok: false, error: `"${prod.titulo}" ingresa próximamente. Reducí la cantidad para continuar.` }
      }
    }
  }

  const tipoCambioUsd = parseFloat(tcRow?.valor ?? '1') || 1

  const lineas = items.flatMap(item => {
    const prod = productos.find(p => p.id === item.productoId)
    if (!prod || prod.precio_lista5 == null) return []
    const { precio: precioArs } = aplicarTipoCambio(prod.precio_lista5, prod.moneda ?? null, tipoCambioUsd)
    if (precioArs === null) return []
    const ivaRate = ((prod.iva as number | null) ?? 21) / 100
    const precioConIva = Math.round(precioArs * (1 + ivaRate))
    return [{ productoId: item.productoId, titulo: prod.titulo, cantidad: item.cantidad, precioUnit: precioConIva, ivaRate, variante: item.variante ?? null }]
  })

  if (lineas.length === 0) return { ok: false, error: 'Ningún producto tiene precio configurado.' }
  if (lineas.length !== items.length) {
    return { ok: false, error: 'Algunos productos de tu carrito ya no están disponibles. Quitalos del carrito para continuar.' }
  }

  let envio: EnvioResuelto | undefined
  if (envioParams) {
    const { opciones, error: envioError } = await cotizarEnvio({
      items,
      codigo_postal: envioParams.codigo_postal,
      provincia: envioParams.provincia,
    })
    const opcion = opciones.find(o => o.id === envioParams.servicioId)
    if (envioError || !opcion) {
      return { ok: false, error: 'No se pudo verificar el costo de envío. Recalculá antes de continuar.' }
    }
    envio = { descripcion: opcion.descripcion, costo: opcion.costo }
  }

  const subtotal = lineas.reduce((acc, l) => acc + l.precioUnit * l.cantidad, 0)
  // Precio Bruto: derivado del precio con IVA redondeado, con la misma fórmula que el
  // cliente (round(precio / (1 + iva))) para que ambos calculen idéntico descuento
  const subtotalBruto = lineas.reduce((acc, l) => acc + Math.round(l.precioUnit / (1 + l.ivaRate)) * l.cantidad, 0)

  // Descuento por volumen del canal — umbral y monto sobre el Precio Bruto (sin IVA)
  const volMin = (canalCfg?.desc_volumen_monto_min as number | null) ?? null
  const volPct = (canalCfg?.desc_volumen_pct as number | null) ?? null
  const descuentoVolumenCanal = volMin !== null && volPct != null && volPct > 0 && subtotalBruto >= volMin
    ? Math.round(subtotalBruto * volPct / 100)
    : 0
  const basePostVolumenCanal = subtotal - descuentoVolumenCanal

  const descPct = (canalCfg?.desc_transferencia_pct as number | null) ?? 0
  const descuento = descPct > 0 ? Math.round(basePostVolumenCanal * descPct / 100) : 0
  const subtotalPostDescuento = basePostVolumenCanal - descuento

  // Validar mínimo de compra — sobre el subtotal ya con descuentos aplicados
  const minimoCompra = (canalCfg?.minimo_compra as number | null) ?? null
  if (minimoCompra && subtotalPostDescuento < minimoCompra) {
    return {
      ok: false,
      error: `El mínimo de compra es ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(minimoCompra)}.`,
    }
  }

  if (envio && canalCfg) {
    const esAmba = ['B', 'C'].includes(envioParams!.provincia)
    const umbralAmba = canalCfg.envio_amba_gratis_desde as number | null
    const umbralGeneral = canalCfg.envio_gratis_desde as number | null
    if (
      (umbralAmba && esAmba && subtotalPostDescuento >= umbralAmba) ||
      (umbralGeneral && subtotalPostDescuento >= umbralGeneral)
    ) {
      envio = { descripcion: envio.descripcion, costo: 0 }
    }
  }

  const total = subtotalPostDescuento + (envio?.costo ?? 0)

  const diasVencimiento = (canalCfg?.dias_vencimiento_pedido as number | null) ?? 7
  const expiraEn = new Date(Date.now() + diasVencimiento * 24 * 60 * 60 * 1000).toISOString()

  // Cancelar pedidos pendiente_pago previos de transferencia SOLO al mismo destino
  // (reintento). Pedidos a otra dirección — ej. la misma compra para otro local — conviven.
  {
    let q = service
      .from('pedidos')
      .update({ estado: 'cancelado' })
      .eq('cliente_id', user.id)
      .eq('estado', 'pendiente_pago')
      .eq('medio_pago', 'transferencia')
    q = envioParams
      ? q.eq('envio_codigo_postal', envioParams.codigo_postal).eq('envio_calle', envioParams.calle).eq('envio_numero', envioParams.numero)
      : q.is('envio_codigo_postal', null)
    await q
  }

  const { data: pedido, error: pedidoError } = await service
    .from('pedidos')
    .insert({
      cliente_id: user.id,
      estado: comprobantePath ? 'comprobante_subido' : 'pendiente_pago',
      total_usd: total,
      medio_pago: 'transferencia',
      expira_en: expiraEn,
      costo_envio: envio?.costo ?? null,
      envio_descripcion: envio?.descripcion ?? null,
      envio_codigo_postal: envioParams?.codigo_postal ?? null,
      envio_provincia: envioParams?.provincia ?? null,
      envio_calle: envioParams?.calle ?? null,
      envio_numero: envioParams?.numero ?? null,
      envio_piso: envioParams?.piso ?? null,
    })
    .select('id')
    .single()

  if (pedidoError || !pedido) {
    console.error('[checkout/transferencia] insert pedido:', pedidoError?.message)
    return { ok: false, error: 'Error al crear el pedido.' }
  }

  if (comprobantePath) {
    await service.from('comprobantes').insert({ pedido_id: pedido.id, url: comprobantePath })
  }

  const { error: itemsError } = await service.from('pedido_items').insert(
    lineas.map(l => ({
      pedido_id: pedido.id,
      producto_id: l.productoId,
      cantidad: l.cantidad,
      precio_unit: l.precioUnit,
      variante: l.variante ?? null,
    }))
  )

  if (itemsError) {
    await service.from('pedidos').delete().eq('id', pedido.id)
    return { ok: false, error: 'Error al registrar los ítems del pedido.' }
  }

  revalidatePath('/pedidos')
  return { ok: true, pedidoId: String(pedido.id) }
}
