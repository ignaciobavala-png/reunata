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
  envioParams?: EnvioParams
): Promise<{ ok: boolean; init_point?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const service = createServiceClient()

  // Resolver canal del usuario (necesario para múltiplos, config del canal y validar método de pago)
  let canalId: number | null = null
  if (user) {
    const { data: profileCanal } = await supabase
      .from('profiles')
      .select('canal_id')
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
  } else {
    // Guest: requiere datos del comprador
    if (!guestData?.nombre?.trim() || !guestData?.email?.trim()) {
      return { ok: false, error: 'Completá tu nombre y email para continuar.' }
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
  let productoCanalDb: { producto_id: number; multiplo: number | null; descuento_volumen_cantidad_minima: number | null; descuento_volumen_pct: number | null }[] | null = null
  if (canalId) {
    const { data } = await service
      .from('producto_canales')
      .select('producto_id, multiplo, descuento_volumen_cantidad_minima, descuento_volumen_pct')
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
          .select('cuotas_mp_sin_interes, minimo_compra, dias_vencimiento_pedido, envio_gratis_desde, envio_amba_gratis_desde')
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
    return [{ productoId: item.productoId, titulo: prod.titulo, cantidad: item.cantidad, precioUnit: precioConIva, variante: item.variante ?? null }]
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

  // Descuento por volumen — por línea, según cantidad comprada de ESE producto
  const descuentoVolumen = lineas.reduce((acc, l) => {
    const row = productoCanalDb?.find(r => r.producto_id === l.productoId)
    const cantidadMinima = row?.descuento_volumen_cantidad_minima ?? null
    const pct = row?.descuento_volumen_pct ?? null
    if (cantidadMinima && pct && l.cantidad >= cantidadMinima) {
      return acc + Math.round(l.precioUnit * l.cantidad * pct / 100)
    }
    return acc
  }, 0)
  const subtotalPostDescuento = subtotal - descuentoVolumen

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

  // Cancelar pedidos pendiente_pago previos del mismo usuario para evitar acumulación
  // (ocurre cuando el usuario abandona MP y vuelve a intentar)
  if (user) {
    await service
      .from('pedidos')
      .update({ estado: 'cancelado' })
      .eq('cliente_id', user.id)
      .eq('estado', 'pendiente_pago')
      .eq('medio_pago', 'mercadopago')
  } else if (guestData?.email) {
    await service
      .from('pedidos')
      .update({ estado: 'cancelado' })
      .eq('guest_email', guestData.email.trim().toLowerCase())
      .eq('estado', 'pendiente_pago')
      .eq('medio_pago', 'mercadopago')
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

  if (pedidoError || !pedido) return { ok: false, error: 'Error al crear el pedido.' }

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
          ...lineas.map(l => {
            const row = productoCanalDb?.find(r => r.producto_id === l.productoId)
            const cantidadMinima = row?.descuento_volumen_cantidad_minima ?? null
            const pct = row?.descuento_volumen_pct ?? null
            const aplicaDescuento = cantidadMinima != null && pct != null && l.cantidad >= cantidadMinima
            // MP no admite unit_price negativo: el descuento por volumen se pliega
            // en el precio de la línea en vez de mandarse como ítem aparte.
            const totalLinea = l.precioUnit * l.cantidad
            const totalLineaConDescuento = aplicaDescuento
              ? totalLinea - Math.round(totalLinea * (pct as number) / 100)
              : totalLinea
            return {
              id: String(l.productoId),
              title: l.titulo,
              quantity: 1,
              unit_price: totalLineaConDescuento,
              currency_id: 'ARS',
            }
          }),
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
): Promise<{ ok: boolean; pedidoId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: 'Necesitás iniciar sesión para pagar por transferencia.' }

  const { data: perfil } = await supabase
    .from('profiles')
    .select('canal_id')
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

  // Validar múltiplos
  let productoCanalDb: { producto_id: number; multiplo: number | null; descuento_volumen_cantidad_minima: number | null; descuento_volumen_pct: number | null }[] | null = null
  if (canalId) {
    const { data } = await service
      .from('producto_canales')
      .select('producto_id, multiplo, descuento_volumen_cantidad_minima, descuento_volumen_pct')
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
          .select('desc_transferencia_pct, minimo_compra, dias_vencimiento_pedido, envio_gratis_desde, envio_amba_gratis_desde, pagos_habilitados')
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
    return [{ productoId: item.productoId, titulo: prod.titulo, cantidad: item.cantidad, precioUnit: precioConIva, variante: item.variante ?? null }]
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

  // Descuento por volumen — por línea, según cantidad comprada de ESE producto
  const descuentoVolumen = lineas.reduce((acc, l) => {
    const row = productoCanalDb?.find(r => r.producto_id === l.productoId)
    const cantidadMinima = row?.descuento_volumen_cantidad_minima ?? null
    const pct = row?.descuento_volumen_pct ?? null
    if (cantidadMinima && pct && l.cantidad >= cantidadMinima) {
      return acc + Math.round(l.precioUnit * l.cantidad * pct / 100)
    }
    return acc
  }, 0)

  const descPct = (canalCfg?.desc_transferencia_pct as number | null) ?? 0
  const descuento = descPct > 0 ? Math.round((subtotal - descuentoVolumen) * descPct / 100) : 0
  const subtotalPostDescuento = subtotal - descuentoVolumen - descuento

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

  // Cancelar pedidos pendiente_pago previos de transferencia del mismo usuario
  await service
    .from('pedidos')
    .update({ estado: 'cancelado' })
    .eq('cliente_id', user.id)
    .eq('estado', 'pendiente_pago')
    .eq('medio_pago', 'transferencia')

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

  if (pedidoError || !pedido) return { ok: false, error: 'Error al crear el pedido.' }

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
