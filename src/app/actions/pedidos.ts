'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { aplicarTipoCambio } from '@/lib/utils'
import { stockDisponible } from '@/lib/stock'
import { supabaseImg } from '@/lib/images'
import { crearEnvioEnviopack, consultarEnvioEnviopack, cotizarEnvio } from '@/lib/enviopack'
import { resolverTramoVolumen, type ConfigVolumen } from '@/lib/descuento-volumen'

interface LineaPedido {
  productoId: number
  cantidad: number
  variante?: string
}

// Envío a domicilio para el canal Emprendedores — cotiza y se cobra siempre (sin
// envío gratis). El resto de los mayoristas coordina el envío con Elena desde el admin.
interface EnvioBorrador {
  provincia: string
  codigo_postal: string
  servicioId: string
  calle: string
  numero: string
  piso?: string
}

const METODO_NOTA: Record<string, string> = {
  efectivo:             'efectivo',
  transferencia_negro:  'transferencia',
  transferencia_blanco: 'transf. banco',
}

const ROLES_ADMIN = ['master', 'empleado']

async function verificarRolAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()
  return ROLES_ADMIN.includes(perfil?.rol ?? '')
}

// Espejo server-side de EstadoActions.tsx — mismas transiciones que ofrece la UI de admin.
// Server actions e RLS no deben confiar únicamente en que la UI oculte botones inválidos.
const TRANSICIONES_PERMITIDAS: Record<string, string[]> = {
  borrador:           ['pendiente_pago', 'cancelado'],
  pendiente_pago:     ['pago_confirmado', 'sena_confirmada', 'cancelado'],
  comprobante_subido: ['pago_confirmado', 'cancelado'],
  sena_confirmada:    ['pago_confirmado', 'cancelado'],
  pago_confirmado:    ['en_preparacion'],
  en_preparacion:     ['enviado'],
  enviado:            ['entregado'],
}

// Único lugar que decide editabilidad — no derivarla del label del estado en la UI.
// Hoy la única "edición" post-creación es subir un comprobante; deja de admitirla
// desde que el pago queda confirmado en adelante (incluido cancelado).
const ESTADOS_EDITABLES = ['borrador', 'pendiente_pago', 'comprobante_subido']

export async function crearPedidoBorrador(
  lineas: LineaPedido[],
  opciones?: { medioPago?: string; facturaIva?: boolean; comprobantePath?: string; pedidoIdToEdit?: string; envio?: EnvioBorrador },
): Promise<{ ok: boolean; pedidoId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const service = createServiceClient()

  // Edición in-place de un borrador propio: solo mientras siga en "borrador"
  // (una vez subido el comprobante, el pedido queda en revisión y no se toca más).
  if (opciones?.pedidoIdToEdit) {
    const { data: pedidoAEditar } = await service
      .from('pedidos')
      .select('cliente_id, estado')
      .eq('id', opciones.pedidoIdToEdit)
      .single()
    if (!pedidoAEditar || pedidoAEditar.cliente_id !== user.id) {
      return { ok: false, error: 'Pedido no encontrado.' }
    }
    if (pedidoAEditar.estado !== 'borrador') {
      return { ok: false, error: 'Este pedido ya no se puede editar.' }
    }
  }

  const { data: perfil } = await supabase
    .from('profiles')
    .select('aprobado, canal_id')
    .eq('id', user.id)
    .single()

  if (!perfil?.aprobado) return { ok: false, error: 'Tu cuenta aún no está aprobada para hacer pedidos.' }

  // Resolver lista de precios del canal del usuario
  const { data: canal } = await service
    .from('canales')
    .select('lista_precios, slug')
    .eq('id', perfil.canal_id)
    .single()

  const listaPrecio = canal?.lista_precios ?? 'precio_lista3'
  // precio_lista5 (Emprendedores, minorista) ya trae IVA incluido: el recargo "en
  // blanco" (Factura A) NO aplica porque el IVA ya está en el precio; solo lista3
  // (neto) suma ese recargo. Sin este gate, Emprendedores paga IVA dos veces.
  const precioIncluyeIva = listaPrecio === 'precio_lista5'
  // El envío desde el carrito solo aplica al canal Emprendedores; ignorar el resto.
  const envioParams = canal?.slug === 'emprendedores' ? opciones?.envio : undefined

  const [{ data: productos }, { data: tcRow }, { data: canalConfig }, { count: pedidosCount }] = await Promise.all([
    service
      .from('productos')
      .select('id, precio_lista1, precio_lista2, precio_lista3, precio_lista4, precio_lista5, moneda, stock_visible, stock, variantes')
      .in('id', lineas.map(l => l.productoId))
      .eq('activo', true),
    service
      .from('configuracion')
      .select('valor')
      .eq('clave', 'tipo_cambio_usd')
      .maybeSingle(),
    service
      .from('canales_config')
      .select('desc_autogestion_primera_pct, desc_autogestion_siguientes_pct, desc_efectivo_pct, desc_transferencia_pct, recargo_transf_blanco_pct, minimo_compra, desc_volumen_monto_min, desc_volumen_pct, desc_volumen_monto_min_2, desc_volumen_pct_2, desc_volumen_monto_min_3, desc_volumen_pct_3')
      .eq('canal_id', perfil.canal_id)
      .maybeSingle(),
    service
      .from('pedidos')
      .select('id', { count: 'exact', head: true })
      .eq('cliente_id', user.id)
      .neq('estado', 'cancelado'),
  ])

  if (!productos?.length) return { ok: false, error: 'Productos no disponibles.' }

  // Validar múltiplos contra producto_canales
  const { data: productoCanalDb } = await service
    .from('producto_canales')
    .select('producto_id, multiplo')
    .eq('canal_id', perfil.canal_id)
    .in('producto_id', lineas.map(l => l.productoId))

  for (const linea of lineas) {
    const row = productoCanalDb?.find(r => r.producto_id === linea.productoId)
    const multiplo = row?.multiplo ?? 1
    if (multiplo > 1 && linea.cantidad % multiplo !== 0) {
      return { ok: false, error: `La cantidad de un producto debe ser múltiplo de ${multiplo}.` }
    }
  }

  // Validar stock disponible
  for (const linea of lineas) {
    const prod = productos.find(p => p.id === linea.productoId)
    if (prod) {
      const disponible = stockDisponible(prod, linea.variante)
      if (disponible !== null && disponible < linea.cantidad) {
        return { ok: false, error: `Stock insuficiente para el producto #${linea.productoId}. Disponible: ${disponible}.` }
      }
    }
  }

  const tipoCambioUsd = parseFloat(tcRow?.valor ?? '1') || 1

  const lineasResueltas = lineas.flatMap(l => {
    const prod = productos.find(p => p.id === l.productoId)
    if (!prod) return []
    const precioRaw = prod[listaPrecio as keyof typeof prod] as number | null
    if (!precioRaw) return []
    const { precio: precioArs } = aplicarTipoCambio(precioRaw, prod.moneda ?? null, tipoCambioUsd)
    if (precioArs === null) return []
    return [{ productoId: l.productoId, cantidad: l.cantidad, precioUnit: precioArs, variante: l.variante ?? null }]
  })

  if (lineasResueltas.length === 0) return { ok: false, error: 'Ningún producto tiene precio configurado.' }
  // Nunca crear el pedido con menos ítems de los que el usuario ve en su carrito:
  // si un producto se desactivó o quedó sin precio para su lista, se rechaza todo.
  if (lineasResueltas.length !== lineas.length) {
    return { ok: false, error: 'Algunos productos de tu carrito ya no están disponibles. Quitalos del carrito para continuar.' }
  }

  const subtotal = lineasResueltas.reduce((acc, l) => acc + l.precioUnit * l.cantidad, 0)

  // Orden de descuentos (pedido del tester): 1) WEB (autogestión), 2) Volumen,
  // 3) forma de pago. Cada paso se aplica sobre el saldo del anterior.

  // 1) Descuento web (autogestión) — sobre el bruto, para que sea el más alto posible
  const esPrimeraCompra = (pedidosCount ?? 0) === 0
  const pctAutogestion = esPrimeraCompra
    ? (canalConfig?.desc_autogestion_primera_pct ?? 0)
    : (canalConfig?.desc_autogestion_siguientes_pct ?? 0)
  const ajusteAutogestion = pctAutogestion > 0 ? -Math.round(subtotal * pctAutogestion / 100) : 0
  const basePostAutogestion = subtotal + ajusteAutogestion

  // 2) Descuento por volumen — el umbral se evalúa sobre el bruto (calificás por lo
  // que comprás), pero el % se aplica sobre la base ya descontada por web
  const tramoVol = resolverTramoVolumen(canalConfig as ConfigVolumen | null, subtotal)
  const ajusteVolumenCanal = tramoVol ? -Math.round(basePostAutogestion * tramoVol.pct / 100) : 0
  const basePostVolumenCanal = basePostAutogestion + ajusteVolumenCanal

  // 3) Descuento / recargo por método de pago — sobre el precio ya descontado por
  // web y volumen (mismo criterio que el cliente)
  const medioPagoOriginal = opciones?.medioPago
  let ajusteMetodoPago = 0
  let pctMetodoPago = 0
  if (medioPagoOriginal === 'efectivo' && (canalConfig?.desc_efectivo_pct ?? 0) > 0) {
    pctMetodoPago = canalConfig!.desc_efectivo_pct!
    ajusteMetodoPago = -Math.round(basePostVolumenCanal * pctMetodoPago / 100)
  } else if (medioPagoOriginal === 'transferencia_negro' && (canalConfig?.desc_transferencia_pct ?? 0) > 0) {
    pctMetodoPago = canalConfig!.desc_transferencia_pct!
    ajusteMetodoPago = -Math.round(basePostVolumenCanal * pctMetodoPago / 100)
  } else if (medioPagoOriginal === 'transferencia_blanco' && !precioIncluyeIva && (canalConfig?.recargo_transf_blanco_pct ?? 0) > 0) {
    pctMetodoPago = canalConfig!.recargo_transf_blanco_pct!
    ajusteMetodoPago = Math.round(basePostVolumenCanal * pctMetodoPago / 100)
  }

  const totalMercaderia = basePostVolumenCanal + ajusteMetodoPago

  // Validar mínimo de compra — sobre el Total Bruto (post desc. web/volumen),
  // sin el ajuste por forma de pago (pedido del tester, mismo criterio que el carrito)
  const minimoCompra = (canalConfig?.minimo_compra as number | null) ?? null
  if (minimoCompra && basePostVolumenCanal < minimoCompra) {
    return { ok: false, error: `El mínimo de compra es ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(minimoCompra)}.` }
  }

  // Envío (solo Emprendedores) — se cotiza server-side y se cobra siempre (sin envío
  // gratis). El costo del cliente nunca se confía: se recotiza acá contra Enviopack.
  let envioResuelto: { descripcion: string; costo: number } | null = null
  if (envioParams) {
    const { opciones: opcsEnvio, error: envioError } = await cotizarEnvio({
      items: lineas.map(l => ({ productoId: l.productoId, cantidad: l.cantidad })),
      codigo_postal: envioParams.codigo_postal,
      provincia: envioParams.provincia,
    })
    const opcion = opcsEnvio.find(o => o.id === envioParams.servicioId)
    if (envioError || !opcion) {
      return { ok: false, error: 'No se pudo verificar el costo de envío. Recalculá antes de continuar.' }
    }
    envioResuelto = { descripcion: opcion.descripcion, costo: opcion.costo }
  }

  const totalFinal = totalMercaderia + (envioResuelto?.costo ?? 0)

  const notaPartes: string[] = []
  if (pctAutogestion > 0) notaPartes.push(`${pctAutogestion}% autogestión — ${esPrimeraCompra ? 'primera compra' : 'compra recurrente'}`)
  if (ajusteVolumenCanal !== 0 && tramoVol) notaPartes.push(`${tramoVol.pct}% desc. por volumen de compra`)
  if (ajusteMetodoPago !== 0) {
    notaPartes.push(`${ajusteMetodoPago < 0 ? `${pctMetodoPago}% desc.` : `${pctMetodoPago}% recargo`} ${METODO_NOTA[medioPagoOriginal!] ?? medioPagoOriginal}`)
  }
  const descuento_sugerido = pctAutogestion > 0 ? pctAutogestion : null
  const descuento_nota = notaPartes.length > 0 ? notaPartes.join(' + ') : null

  // Mapear transferencia_negro → transferencia_cueva para el DB (el canal config usa transferencia_negro como clave UI)
  const medioPagoDb = opciones?.medioPago === 'transferencia_negro'
    ? 'transferencia_cueva'
    : (opciones?.medioPago ?? null)

  const tieneComprobante = Boolean(opciones?.comprobantePath)
  const expiraEn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const camposPedido = {
    estado: tieneComprobante ? 'comprobante_subido' : 'borrador',
    total_usd: totalFinal,
    descuento_sugerido,
    descuento_nota,
    expira_en: expiraEn,
    ...(medioPagoDb ? { medio_pago: medioPagoDb } : {}),
    ...(opciones?.facturaIva !== undefined ? { factura_iva: opciones.facturaIva } : {}),
    ...(envioParams ? {
      costo_envio: envioResuelto?.costo ?? null,
      envio_descripcion: envioResuelto?.descripcion ?? null,
      envio_codigo_postal: envioParams.codigo_postal,
      envio_provincia: envioParams.provincia,
      envio_calle: envioParams.calle,
      envio_numero: envioParams.numero,
      envio_piso: envioParams.piso ?? null,
      envio_servicio: envioParams.servicioId,
    } : {}),
  }

  let pedidoId: string
  if (opciones?.pedidoIdToEdit) {
    pedidoId = opciones.pedidoIdToEdit
    const { error } = await service.from('pedidos').update(camposPedido).eq('id', pedidoId)
    if (error) return { ok: false, error: error.message }
    await service.from('pedido_items').delete().eq('pedido_id', pedidoId)
  } else {
    const { data: pedido, error } = await service
      .from('pedidos')
      .insert({ cliente_id: user.id, ...camposPedido })
      .select('id')
      .single()
    if (error || !pedido) return { ok: false, error: error?.message ?? 'Error creando pedido' }
    pedidoId = pedido.id
  }

  const { error: itemsError } = await service.from('pedido_items').insert(
    lineasResueltas.map(l => ({
      pedido_id: pedidoId,
      producto_id: l.productoId,
      cantidad: l.cantidad,
      precio_unit: l.precioUnit,
      variante: l.variante,
    }))
  )
  if (itemsError) {
    if (!opciones?.pedidoIdToEdit) await service.from('pedidos').delete().eq('id', pedidoId)
    return { ok: false, error: 'Error al registrar los ítems del pedido. Intentá de nuevo.' }
  }

  if (tieneComprobante) {
    await service.from('comprobantes').insert({ pedido_id: pedidoId, url: opciones!.comprobantePath })
  }

  revalidatePath('/pedidos')
  revalidatePath(`/pedidos/${pedidoId}`)
  return { ok: true, pedidoId }
}

export async function subirComprobante(pedidoId: string, path: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const service = createServiceClient()

  const { data: pedido } = await service
    .from('pedidos')
    .select('cliente_id, estado')
    .eq('id', pedidoId)
    .single()

  if (!pedido || pedido.cliente_id !== user.id) throw new Error('Pedido no encontrado.')
  if (!['borrador', 'pendiente_pago'].includes(pedido.estado)) {
    throw new Error('Este pedido ya no admite un nuevo comprobante.')
  }

  await service.from('comprobantes').insert({ pedido_id: pedidoId, url: path })
  await service.from('pedidos').update({ estado: 'comprobante_subido' }).eq('id', pedidoId)
  revalidatePath(`/pedidos/${pedidoId}`)
}

export async function confirmarPago(pedidoId: string, medioPago: string, referencia?: string) {
  if (!await verificarRolAdmin()) throw new Error('Sin permisos.')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = createServiceClient()

  const { data: pedido } = await service
    .from('pedidos')
    .select('estado')
    .eq('id', pedidoId)
    .single()

  if (!pedido) throw new Error('Pedido no encontrado.')
  if (!(TRANSICIONES_PERMITIDAS[pedido.estado] ?? []).includes('pago_confirmado')) {
    throw new Error(`No se puede confirmar el pago desde el estado "${pedido.estado}".`)
  }

  await service.from('pedidos').update({
    estado: 'pago_confirmado',
    editable: false,
    medio_pago: medioPago,
    referencia_pago: referencia ?? null,
    pago_confirmado_por: user!.id,
    fecha_pago: new Date().toISOString(),
  }).eq('id', pedidoId)
  revalidatePath(`/dashboard/admin/pedidos`)
  revalidatePath(`/pedidos/${pedidoId}`)
}

// Genera el envío en Enviopack para un pedido y guarda el id/estado. Lo dispara
// Elena manualmente desde el detalle del pedido. No confirma el pago ni cambia el
// estado del pedido; solo crea el envío en Enviopack.
export async function generarEnvio(pedidoId: string): Promise<{ ok: boolean; error?: string }> {
  if (!await verificarRolAdmin()) return { ok: false, error: 'Sin permisos.' }

  const res = await crearEnvioEnviopack(pedidoId)
  if (!res.ok) return { ok: false, error: res.error }

  const service = createServiceClient()
  const { error } = await service.from('pedidos').update({
    enviopack_envio_id: res.envioId,
    enviopack_estado: res.estado,
    metodo_envio: 'enviopack',
  }).eq('id', pedidoId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/admin/pedidos')
  revalidatePath(`/dashboard/admin/pedidos/${pedidoId}`)
  return { ok: true }
}

// Marca con qué método se despacha el pedido, para el registro/conteo por canal.
// 'interno' lo elige Elena (moto, remís, retiro en local, otro correo); pasar null
// para deshacer. No se permite tocar el método si ya se generó un envío en Enviopack.
export async function marcarMetodoEnvio(
  pedidoId: string,
  metodo: 'interno' | null,
): Promise<{ ok: boolean; error?: string }> {
  if (!await verificarRolAdmin()) return { ok: false, error: 'Sin permisos.' }

  const service = createServiceClient()
  const { data: pedido } = await service
    .from('pedidos')
    .select('enviopack_envio_id')
    .eq('id', pedidoId)
    .single()
  if (pedido?.enviopack_envio_id) {
    return { ok: false, error: 'El pedido ya tiene un envío generado en Enviopack.' }
  }

  const { error } = await service
    .from('pedidos')
    .update({ metodo_envio: metodo })
    .eq('id', pedidoId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/admin/pedidos')
  revalidatePath(`/dashboard/admin/pedidos/${pedidoId}`)
  return { ok: true }
}

// Refresco manual del estado del envío en Enviopack — respaldo del webhook.
// Si el webhook falla o tarda, Elena puede actualizar a mano desde el pedido.
export async function actualizarEstadoEnvio(pedidoId: string): Promise<{ ok: boolean; estado?: string; error?: string }> {
  if (!await verificarRolAdmin()) return { ok: false, error: 'Sin permisos.' }

  const service = createServiceClient()
  const { data: pedido } = await service
    .from('pedidos')
    .select('enviopack_envio_id')
    .eq('id', pedidoId)
    .single()
  if (!pedido?.enviopack_envio_id) return { ok: false, error: 'El pedido no tiene envío generado.' }

  const envio = await consultarEnvioEnviopack(pedido.enviopack_envio_id)
  if (!envio.ok) return { ok: false, error: envio.error }

  const nuevoEstado = envio.procesado ? 'procesado' : envio.confirmado ? 'en_proceso' : 'sin_confirmar'
  const { error } = await service.from('pedidos').update({
    enviopack_estado: nuevoEstado,
    ...(envio.trackingNumber ? { tracking: envio.trackingNumber } : {}),
  }).eq('id', pedidoId)
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/dashboard/admin/pedidos/${pedidoId}`)
  return { ok: true, estado: nuevoEstado }
}

export async function actualizarEstadoPedido(pedidoId: string, estado: string) {
  if (!await verificarRolAdmin()) throw new Error('Sin permisos.')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = createServiceClient()

  const { data: pedidoActual } = await service
    .from('pedidos')
    .select('estado, medio_pago')
    .eq('id', pedidoId)
    .single()

  if (!pedidoActual) throw new Error('Pedido no encontrado.')

  const permitidos = TRANSICIONES_PERMITIDAS[pedidoActual.estado] ?? []
  if (!permitidos.includes(estado)) {
    throw new Error(`No se puede pasar de "${pedidoActual.estado}" a "${estado}".`)
  }
  if (estado === 'sena_confirmada' && pedidoActual.medio_pago !== 'efectivo') {
    throw new Error('La seña solo aplica a pedidos con medio de pago efectivo.')
  }

  const updates: Record<string, unknown> = { estado, editable: ESTADOS_EDITABLES.includes(estado) }
  if (estado === 'sena_confirmada') {
    updates.expira_en = null
  }
  if (estado === 'pago_confirmado') {
    updates.fecha_pago = new Date().toISOString()
    updates.expira_en = null
  }

  const { data: pedido } = await service
    .from('pedidos')
    .update(updates)
    .eq('id', pedidoId)
    .select('cliente_id')
    .single()

  await service.from('pedido_estado_historial').insert({
    pedido_id: pedidoId,
    estado_anterior: pedidoActual.estado,
    estado_nuevo: estado,
    usuario_id: user?.id ?? null,
  })

  // Sincronizar última compra para recontacto (espejo del webhook de MP)
  if (estado === 'pago_confirmado' && pedido?.cliente_id) {
    await service
      .from('profiles')
      .update({ ultima_compra_en: new Date().toISOString(), requiere_recontacto: false })
      .eq('id', pedido.cliente_id)
  }

  revalidatePath('/dashboard/admin/pedidos')
  revalidatePath(`/dashboard/admin/pedidos/${pedidoId}`)
  revalidatePath(`/pedidos/${pedidoId}`)
}

// ── Volver a pedir ──────────────────────────────────────────────────────────
// Devuelve los ítems de un pedido anterior con los datos DE HOY (precio según
// la lista del canal, stock, múltiplo). Lo que ya no está disponible se omite
// y se informa la cantidad para avisarle al cliente.

export interface ItemRecompra {
  productoId: number
  itemKey: string
  codigo_interno: string
  titulo: string
  precio: number
  cantidad: number
  multiplo: number
  foto_url: string | null
  variante?: string
  stock: number | null
}

export async function getItemsParaRecomprar(
  pedidoId: string,
): Promise<{ ok: true; items: ItemRecompra[]; omitidos: number } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Necesitás iniciar sesión.' }

  const service = createServiceClient()

  // El pedido debe ser del usuario — nunca recomprar pedidos ajenos
  const { data: pedido } = await service
    .from('pedidos')
    .select('id, cliente_id, pedido_items(producto_id, cantidad, variante)')
    .eq('id', pedidoId)
    .eq('cliente_id', user.id)
    .single()

  if (!pedido) return { ok: false, error: 'Pedido no encontrado.' }
  const lineasPedido = (pedido.pedido_items ?? []) as { producto_id: number; cantidad: number; variante: string | null }[]
  if (lineasPedido.length === 0) return { ok: false, error: 'El pedido no tiene productos.' }

  const { data: perfil } = await service
    .from('profiles')
    .select('canal_id')
    .eq('id', user.id)
    .single()
  const { data: canal } = await service
    .from('canales')
    .select('lista_precios')
    .eq('id', perfil?.canal_id ?? 0)
    .maybeSingle()

  const listaPrecio = canal?.lista_precios ?? 'precio_lista5'

  const ids = [...new Set(lineasPedido.map(l => l.producto_id))]
  const [{ data: productos }, { data: pcRows }, { data: tcRow }] = await Promise.all([
    service
      .from('productos')
      .select('id, titulo, codigo_interno, moneda, iva, stock, stock_visible, variantes, precio_lista1, precio_lista2, precio_lista3, precio_lista4, precio_lista5, producto_fotos(url, orden)')
      .in('id', ids)
      .eq('activo', true),
    service
      .from('producto_canales')
      .select('producto_id, multiplo')
      .eq('canal_id', perfil?.canal_id ?? 0)
      .in('producto_id', ids),
    service.from('configuracion').select('valor').eq('clave', 'tipo_cambio_usd').maybeSingle(),
  ])

  const tipoCambioUsd = parseFloat(tcRow?.valor ?? '1') || 1
  const multiplos: Record<number, number> = {}
  for (const r of pcRows ?? []) multiplos[r.producto_id] = r.multiplo ?? 1
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

  const items: ItemRecompra[] = []
  let omitidos = 0

  for (const linea of lineasPedido) {
    const prod = productos?.find(p => p.id === linea.producto_id)
    // Producto inactivo, fuera del canal del usuario o sin precio para su lista → se omite
    if (!prod || !(linea.producto_id in multiplos)) { omitidos++; continue }
    const precioRaw = (prod as Record<string, unknown>)[listaPrecio] as number | null
    if (precioRaw == null) { omitidos++; continue }
    const { precio: precioArs } = aplicarTipoCambio(precioRaw, prod.moneda ?? null, tipoCambioUsd)
    if (precioArs === null) { omitidos++; continue }
    // precio_lista5 (minorista) ya viene con IVA incluido y precio_lista3 (mayorista) es neto:
    // en ambos casos el precio de la lista se guarda tal cual, sin recargar IVA.
    const precio = precioArs

    const disponible = stockDisponible(prod, linea.variante)
    const multiplo = multiplos[linea.producto_id] ?? 1
    // Cantidad del pedido original, ajustada al múltiplo vigente y al stock de hoy
    let cantidad = Math.ceil(linea.cantidad / multiplo) * multiplo
    if (disponible !== null) cantidad = Math.min(cantidad, Math.floor(disponible / multiplo) * multiplo)
    if (cantidad <= 0) { omitidos++; continue }

    const fotos = ((prod.producto_fotos ?? []) as { url: string; orden: number }[]).sort((a, b) => a.orden - b.orden)
    items.push({
      productoId: prod.id,
      itemKey: `${prod.id}:${linea.variante ?? ''}`,
      codigo_interno: prod.codigo_interno,
      titulo: prod.titulo,
      precio,
      cantidad,
      multiplo,
      foto_url: fotos[0]?.url ? supabaseImg(supabaseUrl, fotos[0].url, 200) : null,
      variante: linea.variante ?? undefined,
      stock: disponible,
    })
  }

  return { ok: true, items, omitidos }
}
