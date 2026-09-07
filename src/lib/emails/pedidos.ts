import { createServiceClient } from '@/lib/supabase/server'
import { formatPrecio } from '@/lib/utils'
import { enviarMail, SITIO } from './enviar'
import PedidoEstado, { type EstadoNotificable } from '@/emails/pedido-estado'

const NOTIFICABLES: EstadoNotificable[] = ['pago_confirmado', 'en_preparacion', 'enviado']

export function esEstadoNotificable(estado: string): estado is EstadoNotificable {
  return (NOTIFICABLES as string[]).includes(estado)
}

/**
 * Avisa al cliente que su pedido cambió de estado.
 *
 * Lo llaman los dos lugares que mueven un pedido —el panel de admin y el
 * webhook de Mercado Pago—, así que la regla de qué estados avisan y con qué
 * datos vive acá y no duplicada en cada uno.
 *
 * Lee el pedido con la service key porque el webhook de MP no tiene sesión.
 */
export async function notificarEstadoPedido(pedidoId: string, estado: string) {
  if (!esEstadoNotificable(estado)) return

  const service = createServiceClient()

  const { data: pedido } = await service
    .from('pedidos')
    .select(
      'numero, total_usd, envio_descripcion, tracking, guest_email, guest_nombre, cliente_id',
    )
    .eq('id', pedidoId)
    .single()

  if (!pedido) return

  // Los pedidos de invitado guardan el contacto en el propio pedido; los de
  // cliente registrado, en su perfil.
  let email = pedido.guest_email as string | null
  let nombre = pedido.guest_nombre as string | null

  if (!email && pedido.cliente_id) {
    const { data: perfil } = await service
      .from('profiles')
      .select('email, nombre')
      .eq('id', pedido.cliente_id)
      .single()
    email = perfil?.email ?? null
    nombre = perfil?.nombre ?? nombre
  }

  if (!email) return

  await enviarMail({
    to: email,
    subject:
      estado === 'enviado'
        ? `Tu pedido #${pedido.numero} está en camino`
        : `Pedido #${pedido.numero} — actualización`,
    react: PedidoEstado({
      estado,
      nombre: nombre?.split(' ')[0] ?? 'Hola',
      numero: pedido.numero,
      total: pedido.total_usd != null ? formatPrecio(Number(pedido.total_usd)) : null,
      envio: pedido.envio_descripcion,
      tracking: pedido.tracking,
      urlPedido: `${SITIO}/pedidos/${pedidoId}`,
    }),
  })
}
