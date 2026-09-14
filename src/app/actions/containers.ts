'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * El alta de reservas se eliminó el 14/09/2026.
 *
 * Desde que Gastón definió "un solo pago, como un pedido normal", la preventa
 * entra al carrito y se confirma como un `pedido` más: ver `crearPedidoBorrador`
 * en actions/pedidos.ts, que descuenta `container_items.comprometido` con la RPC
 * `preventa_comprometer`.
 *
 * Esta función no se dejó deprecada sino borrada a propósito: eran DOS caminos
 * vivos escribiendo el mismo `comprometido` por vías distintas, y el día que
 * alguien volviera a enchufar el botón viejo el barco se habría vendido dos
 * veces sin que ningún error saltara.
 *
 * Las reservas creadas durante el beta siguen existiendo en `container_reservas`
 * y se ven en /cuenta/reservas y en el panel. Por eso la cancelación sí queda.
 */

export async function cancelarReservaContainer(reservaId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('container_cancelar_reserva', { p_reserva_id: reservaId })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
