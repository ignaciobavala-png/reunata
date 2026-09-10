'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resolverCanalTienda, getProductosDelCanal } from '@/lib/tienda'
import { aplicarTipoCambio } from '@/lib/utils'
import { netoDesdeBruto } from '@/lib/iva'
import { descuentoVigente, precioConDescuento, type EtapaContainer } from '@/lib/containers'

export interface ItemReserva {
  itemId: number
  cantidad: number
}

/**
 * Reserva mercadería de un viaje.
 *
 * El precio NO viene del cliente: se recalcula acá desde la lista del canal y el
 * descuento del viaje. Lo que el navegador manda es solo qué ítem y cuánto —
 * cualquier otra cosa sería aceptar el precio que el comprador quiera pagar.
 *
 * El descuento del comprometido lo hace la función container_reservar en la misma
 * transacción que el alta: si fueran dos pasos, dos clientes simultáneos se llevan
 * la misma unidad.
 */
export async function reservarContainer(
  containerId: string,
  items: ItemReserva[],
  notas?: string,
): Promise<{ ok: boolean; reservaId?: string; numero?: number; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Necesitás iniciar sesión.' }

  const limpios = items.filter(i => Number.isInteger(i.itemId) && Number.isInteger(i.cantidad) && i.cantidad > 0)
  if (limpios.length === 0) return { ok: false, error: 'No elegiste ninguna cantidad.' }

  const { canalId, listaPrecio, mostrarPrecios, tipoCambioUsd } = await resolverCanalTienda()
  if (!mostrarPrecios || !listaPrecio) {
    return { ok: false, error: 'Tu cuenta todavía no tiene precios asignados.' }
  }

  // Las reglas de canal se revalidan acá aunque el endpoint de disponibilidad ya
  // las aplique: el navegador manda ids de ítem y no hay que creerle. Es el mismo
  // criterio que el checkout, que revalida el múltiplo server-side.
  const { ids: idsCanal, multiplos } = await getProductosDelCanal(canalId)
  const permitidos = new Set(idsCanal)

  const service = createServiceClient()

  const { data: filas } = await service
    .from('container_items')
    .select(`
      id, producto_id, codigo_interno, titulo, precio_base, container_id,
      containers!inner ( id, etapa, descuento_china, descuento_oceano )
    `)
    .in('id', limpios.map(i => i.itemId))

  if (!filas || filas.length !== limpios.length) {
    return { ok: false, error: 'Alguno de los colores elegidos ya no está disponible.' }
  }

  type Fila = {
    id: number
    producto_id: number | null
    codigo_interno: string
    titulo: string
    precio_base: number | null
    container_id: string
    containers: { id: string; etapa: EtapaContainer; descuento_china: number; descuento_oceano: number }
  }
  const tipadas = filas as unknown as Fila[]

  if (tipadas.some(f => f.container_id !== containerId)) {
    return { ok: false, error: 'Los ítems no pertenecen al mismo viaje.' }
  }

  // Mismo producto que no se puede comprar en tienda, tampoco se puede reservar.
  const fueraDeCanal = tipadas.find(f => f.producto_id == null || !permitidos.has(f.producto_id))
  if (fueraDeCanal) {
    return { ok: false, error: `"${fueraDeCanal.titulo}" no está disponible para tu cuenta.` }
  }

  // Bulto mínimo, con el mismo mensaje que da el checkout.
  for (const item of limpios) {
    const fila = tipadas.find(f => f.id === item.itemId)!
    const multiplo = multiplos[fila.producto_id!] ?? 1
    if (multiplo > 1 && item.cantidad % multiplo !== 0) {
      return { ok: false, error: `"${fila.titulo}" debe reservarse en múltiplos de ${multiplo} unidades.` }
    }
  }

  const codigos = [...new Set(tipadas.map(f => f.codigo_interno))]
  const { data: productos } = await service
    .from('productos')
    .select(`codigo_interno, moneda, iva, ${listaPrecio}`)
    .in('codigo_interno', codigos)
    .eq('activo', true)

  const precioPorCodigo = new Map<string, { precio: number; iva: number | null }>()
  for (const p of productos ?? []) {
    const row = p as unknown as Record<string, unknown>
    const { precio } = aplicarTipoCambio(
      (row[listaPrecio] ?? null) as number | null,
      (row.moneda ?? null) as string | null,
      tipoCambioUsd,
    )
    if (precio === null) continue
    precioPorCodigo.set(row.codigo_interno as string, { precio, iva: (row.iva ?? null) as number | null })
  }

  const payload = []
  for (const item of limpios) {
    const fila = tipadas.find(f => f.id === item.itemId)!
    const base = precioPorCodigo.get(fila.codigo_interno)
    if (!base) return { ok: false, error: 'No hay precio de lista para uno de los productos.' }

    const descuentoPct = descuentoVigente(fila.containers)
    const precioLista = fila.precio_base != null ? Math.round(Number(fila.precio_base)) : base.precio
    const precioUnit = precioConDescuento(precioLista, descuentoPct)

    payload.push({
      container_item_id: item.itemId,
      cantidad: item.cantidad,
      precio_unit: precioUnit,
      neto_unit: netoDesdeBruto(precioUnit, base.iva),
    })
  }

  const { data: reservaId, error } = await supabase.rpc('container_reservar', {
    p_container_id: containerId,
    p_items: payload,
    p_notas: notas ?? null,
  })

  if (error) return { ok: false, error: error.message }

  // El número es lo que el cliente va a nombrar por teléfono, así que se devuelve
  // para mostrarlo en el acuse y no obligarlo a ir a buscarlo a su cuenta.
  const { data: creada } = await service
    .from('container_reservas')
    .select('numero')
    .eq('id', reservaId as string)
    .single()

  return { ok: true, reservaId: reservaId as string, numero: creada?.numero as number | undefined }
}

export async function cancelarReservaContainer(reservaId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('container_cancelar_reserva', { p_reserva_id: reservaId })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
