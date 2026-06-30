'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { aplicarTipoCambio } from '@/lib/utils'

interface LineaPedido {
  productoId: number
  cantidad: number
  variante?: string
}

const METODO_NOTA: Record<string, string> = {
  efectivo:             'efectivo',
  transferencia_negro:  'transferencia',
  transferencia_blanco: 'transf. banco',
}

export async function crearPedidoBorrador(
  lineas: LineaPedido[],
  opciones?: { medioPago?: string; facturaIva?: boolean; comprobantePath?: string },
): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const service = createServiceClient()

  const { data: perfil } = await supabase
    .from('profiles')
    .select('aprobado, canal_id')
    .eq('id', user.id)
    .single()

  if (!perfil?.aprobado) throw new Error('Tu cuenta aún no está aprobada para hacer pedidos.')

  // Resolver lista de precios del canal del usuario
  const { data: canal } = await service
    .from('canales')
    .select('lista_precios')
    .eq('id', perfil.canal_id)
    .single()

  const listaPrecio = canal?.lista_precios ?? 'precio_lista3'

  const [{ data: productos }, { data: tcRow }, { data: canalConfig }, { count: pedidosCount }] = await Promise.all([
    service
      .from('productos')
      .select('id, precio_lista1, precio_lista2, precio_lista3, precio_lista4, precio_lista5, moneda, stock_visible, stock')
      .in('id', lineas.map(l => l.productoId))
      .eq('activo', true),
    service
      .from('configuracion')
      .select('valor')
      .eq('clave', 'tipo_cambio_usd')
      .maybeSingle(),
    service
      .from('canales_config')
      .select('desc_autogestion_primera_pct, desc_autogestion_siguientes_pct, desc_efectivo_pct, desc_transferencia_pct, recargo_transf_blanco_pct')
      .eq('canal_id', perfil.canal_id)
      .maybeSingle(),
    service
      .from('pedidos')
      .select('id', { count: 'exact', head: true })
      .eq('cliente_id', user.id)
      .neq('estado', 'cancelado'),
  ])

  if (!productos?.length) throw new Error('Productos no disponibles.')

  // Validar múltiplos contra producto_canales
  const { data: multiplosDb } = await service
    .from('producto_canales')
    .select('producto_id, multiplo')
    .eq('canal_id', perfil.canal_id)
    .in('producto_id', lineas.map(l => l.productoId))

  for (const linea of lineas) {
    const row = multiplosDb?.find(r => r.producto_id === linea.productoId)
    const multiplo = row?.multiplo ?? 1
    if (multiplo > 1 && linea.cantidad % multiplo !== 0) {
      throw new Error(`La cantidad de un producto debe ser múltiplo de ${multiplo}.`)
    }
  }

  // Validar stock disponible
  for (const linea of lineas) {
    const prod = productos.find(p => p.id === linea.productoId)
    if (prod) {
      const stockDisponible = prod.stock_visible ?? prod.stock
      if (stockDisponible !== null && stockDisponible < linea.cantidad) {
        throw new Error(`Stock insuficiente para el producto #${linea.productoId}. Disponible: ${stockDisponible}.`)
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

  if (lineasResueltas.length === 0) throw new Error('Ningún producto tiene precio configurado.')

  const subtotal = lineasResueltas.reduce((acc, l) => acc + l.precioUnit * l.cantidad, 0)

  const esPrimeraCompra = (pedidosCount ?? 0) === 0
  const pctAutogestion = esPrimeraCompra
    ? (canalConfig?.desc_autogestion_primera_pct ?? 0)
    : (canalConfig?.desc_autogestion_siguientes_pct ?? 0)
  const ajusteAutogestion = pctAutogestion > 0 ? -Math.round(subtotal * pctAutogestion / 100) : 0

  // Descuento / recargo por método de pago (mismo criterio que el cliente)
  const medioPagoOriginal = opciones?.medioPago
  let ajusteMetodoPago = 0
  if (medioPagoOriginal === 'efectivo' && (canalConfig?.desc_efectivo_pct ?? 0) > 0) {
    ajusteMetodoPago = -Math.round(subtotal * (canalConfig!.desc_efectivo_pct!) / 100)
  } else if (medioPagoOriginal === 'transferencia_negro' && (canalConfig?.desc_transferencia_pct ?? 0) > 0) {
    ajusteMetodoPago = -Math.round(subtotal * (canalConfig!.desc_transferencia_pct!) / 100)
  } else if (medioPagoOriginal === 'transferencia_blanco' && (canalConfig?.recargo_transf_blanco_pct ?? 0) > 0) {
    ajusteMetodoPago = Math.round(subtotal * (canalConfig!.recargo_transf_blanco_pct!) / 100)
  }

  const totalFinal = subtotal + ajusteAutogestion + ajusteMetodoPago

  const notaPartes: string[] = []
  if (pctAutogestion > 0) notaPartes.push(`${pctAutogestion}% autogestión — ${esPrimeraCompra ? 'primera compra' : 'compra recurrente'}`)
  if (ajusteMetodoPago !== 0) {
    const abs = Math.abs(ajusteMetodoPago / subtotal * 100).toFixed(0)
    notaPartes.push(`${ajusteMetodoPago < 0 ? `${abs}% desc.` : `${abs}% recargo`} ${METODO_NOTA[medioPagoOriginal!] ?? medioPagoOriginal}`)
  }
  const descuento_sugerido = pctAutogestion > 0 ? pctAutogestion : null
  const descuento_nota = notaPartes.length > 0 ? notaPartes.join(' + ') : null

  // Mapear transferencia_negro → transferencia_cueva para el DB (el canal config usa transferencia_negro como clave UI)
  const medioPagoDb = opciones?.medioPago === 'transferencia_negro'
    ? 'transferencia_cueva'
    : (opciones?.medioPago ?? null)

  const tieneComprobante = Boolean(opciones?.comprobantePath)
  const expiraEn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: pedido, error } = await service
    .from('pedidos')
    .insert({
      cliente_id: user.id,
      estado: tieneComprobante ? 'comprobante_subido' : 'borrador',
      total_usd: totalFinal,
      descuento_sugerido,
      descuento_nota,
      expira_en: expiraEn,
      ...(medioPagoDb ? { medio_pago: medioPagoDb } : {}),
      ...(opciones?.facturaIva !== undefined ? { factura_iva: opciones.facturaIva } : {}),
    })
    .select('id')
    .single()

  if (error || !pedido) throw new Error(error?.message ?? 'Error creando pedido')

  await service.from('pedido_items').insert(
    lineasResueltas.map(l => ({
      pedido_id: pedido.id,
      producto_id: l.productoId,
      cantidad: l.cantidad,
      precio_unit: l.precioUnit,
      variante: l.variante,
    }))
  )

  if (tieneComprobante) {
    await service.from('comprobantes').insert({ pedido_id: pedido.id, url: opciones!.comprobantePath })
  }

  revalidatePath('/dashboard/cliente/pedidos')
  return pedido.id
}

export async function subirComprobante(pedidoId: string, path: string) {
  const supabase = await createClient()
  await supabase.from('comprobantes').insert({ pedido_id: pedidoId, url: path })
  await supabase.from('pedidos').update({ estado: 'comprobante_subido' }).eq('id', pedidoId)
  revalidatePath(`/dashboard/cliente/pedidos/${pedidoId}`)
  revalidatePath(`/pedidos/${pedidoId}`)
}

export async function confirmarPago(pedidoId: string, medioPago: string, referencia?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('pedidos').update({
    estado: 'pago_confirmado',
    medio_pago: medioPago,
    referencia_pago: referencia ?? null,
    pago_confirmado_por: user!.id,
    fecha_pago: new Date().toISOString(),
  }).eq('id', pedidoId)
  revalidatePath(`/dashboard/admin/pedidos`)
  revalidatePath(`/dashboard/cliente/pedidos/${pedidoId}`)
}

export async function actualizarEstadoPedido(pedidoId: string, estado: string) {
  const supabase = await createClient()
  const service = createServiceClient()
  const updates: Record<string, unknown> = { estado }
  if (estado === 'pago_confirmado') {
    updates.fecha_pago = new Date().toISOString()
    updates.expira_en = null
  }

  const { data: pedido } = await supabase
    .from('pedidos')
    .update(updates)
    .eq('id', pedidoId)
    .select('cliente_id')
    .single()

  // Sincronizar última compra para recontacto (espejo del webhook de MP)
  if (estado === 'pago_confirmado' && pedido?.cliente_id) {
    await service
      .from('profiles')
      .update({ ultima_compra_en: new Date().toISOString(), requiere_recontacto: false })
      .eq('id', pedido.cliente_id)
  }

  revalidatePath('/dashboard/admin/pedidos')
  revalidatePath(`/dashboard/admin/pedidos/${pedidoId}`)
  revalidatePath(`/dashboard/cliente/pedidos/${pedidoId}`)
}
