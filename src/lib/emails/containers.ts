import { createServiceClient } from '@/lib/supabase/server'
import { formatPrecio } from '@/lib/utils'
import { enviarMail, SITIO, CASILLA_INTERNA } from './enviar'
import { ETAPA_LABEL, formatFechaEstimada, type EtapaContainer } from '@/lib/containers'
import { capitalizeVariante } from '@/lib/variantes'
import ReservaRecibida from '@/emails/reserva-recibida'
import AvisoInterno from '@/emails/aviso-interno'

/**
 * Avisa de una reserva de preventa recién creada: al cliente y a la casilla
 * interna.
 *
 * Se llama DESPUÉS de que la reserva quedó escrita, nunca antes: la reserva ya
 * descontó el comprometido y es un hecho consumado, así que si Resend falla el
 * cliente no tiene por qué ver un error ni perderla. `enviarMail` traga sus
 * propios errores por esa razón.
 *
 * El aviso interno importa más que en un pedido normal: acá no hay pago que
 * dispare nada, así que si nadie mira el panel la reserva se queda quieta y la
 * mercadería sigue bloqueada para el resto.
 *
 * Lee con la service key porque la reserva es de otro usuario desde el punto de
 * vista de RLS cuando el aviso lo dispara el panel.
 */
export async function notificarReservaNueva(reservaId: string) {
  const service = createServiceClient()

  const { data: reserva } = await service
    .from('container_reservas')
    .select(`
      numero, etapa_compra, descuento_pct, total, moneda, created_at,
      containers ( nombre, etapa, fecha_arribo_est ),
      profiles ( nombre, email, rol ),
      container_reserva_items (
        cantidad, precio_unit,
        container_items ( titulo, variante )
      )
    `)
    .eq('id', reservaId)
    .single()

  if (!reserva) return

  // El embed to-one de PostgREST llega como objeto; el to-many como array.
  const fila = reserva as unknown as {
    numero: number
    etapa_compra: string
    descuento_pct: number
    total: number | null
    moneda: string | null
    containers: { nombre: string; etapa: EtapaContainer; fecha_arribo_est: string | null } | null
    profiles: { nombre: string | null; email: string | null; rol: string } | null
    container_reserva_items: {
      cantidad: number
      precio_unit: number
      container_items: { titulo: string; variante: string | null } | null
    }[]
  }

  const viaje = fila.containers?.nombre ?? null
  const etapaViaje = fila.containers?.etapa
  const fechaLlegada = formatFechaEstimada(fila.containers?.fecha_arribo_est)
  const total = fila.total != null ? formatPrecio(Number(fila.total), fila.moneda) : null
  const descuentoPct = Number(fila.descuento_pct) || null

  const items = (fila.container_reserva_items ?? []).map(i => {
    const titulo = i.container_items?.titulo ?? 'Producto'
    const color = i.container_items?.variante
    return `${i.cantidad} × ${titulo}${color ? ` · ${capitalizeVariante(color)}` : ''}`
  })

  const unidades = (fila.container_reserva_items ?? []).reduce((a, i) => a + i.cantidad, 0)
  const cliente = fila.profiles?.nombre || fila.profiles?.email || 'Cliente'

  // Al cliente
  if (fila.profiles?.email) {
    await enviarMail({
      to: fila.profiles.email,
      subject: `Reserva #${fila.numero} registrada — ${viaje ?? 'preventa'}`,
      react: ReservaRecibida({
        nombre: fila.profiles.nombre?.split(' ')[0] ?? 'Hola',
        numero: fila.numero,
        viaje,
        etapa: etapaViaje ? ETAPA_LABEL[etapaViaje] : null,
        fechaLlegada,
        descuentoPct,
        total,
        items,
        urlReservas: `${SITIO}/cuenta/reservas`,
      }),
    })
  }

  // A la casilla interna. replyTo al cliente para poder contestarle de una.
  await enviarMail({
    to: CASILLA_INTERNA,
    subject: `Preventa #${fila.numero} — ${cliente} reservó ${unidades} u.`,
    replyTo: fila.profiles?.email ?? undefined,
    react: AvisoInterno({
      titulo: `Reserva de preventa #${fila.numero}`,
      resumen: `${cliente} reservó ${unidades} unidades de ${viaje ?? 'un viaje'}. Hay que confirmarla desde el panel.`,
      filas: [
        ['Cliente', cliente],
        ['Email', fila.profiles?.email ?? null],
        ['Canal', fila.profiles?.rol ?? null],
        ['Viaje', viaje],
        ['Etapa de compra', ETAPA_LABEL[fila.etapa_compra as EtapaContainer] ?? fila.etapa_compra],
        ['Descuento', descuentoPct ? `−${descuentoPct}%` : null],
        ['Unidades', String(unidades)],
        ['Total', total],
        ['Llegada estimada', fechaLlegada],
        ['Detalle', items.join(' · ')],
      ],
      urlPanel: `${SITIO}/dashboard/admin/containers`,
      textoBoton: 'Ver en el panel',
    }),
  })
}
