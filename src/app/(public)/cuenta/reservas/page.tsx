import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { CuentaNav } from '@/components/cuenta/CuentaNav'
import { esRolMayorista } from '@/lib/roles'
import { esMayoristaPorCanal, resolverCanalTienda } from '@/lib/tienda'
import { ReservasClient, type ReservaCliente } from './ReservasClient'
import type { EtapaContainer } from '@/lib/containers'

export const metadata: Metadata = { title: 'Preventa', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/**
 * El estado de cuenta "en el aire" del cliente.
 *
 * Durante los ~60 días del viaje, esta página es el único lugar donde el cliente
 * ve qué comprometió: GESU todavía no sabe nada de esa mercadería. Por eso muestra
 * los totales separados —comprometido, facturado, entregado— y no un solo estado.
 */
export default async function ReservasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=${encodeURIComponent('/cuenta/reservas')}`)

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  const { data: habilitado } = await supabase.rpc('puede_containers')
  if (!habilitado) redirect('/cuenta')

  const service = createServiceClient()

  const { data: reservas } = await service
    .from('container_reservas')
    .select(`
      id, numero, etapa_compra, descuento_pct, total, moneda, estado,
      facturada_en, entregada_en, created_at,
      containers ( nombre, etapa, fecha_arribo_est ),
      container_reserva_items (
        cantidad, precio_unit, neto_unit,
        container_items ( codigo_interno, titulo, variante )
      )
    `)
    .eq('cliente_id', user.id)
    .order('created_at', { ascending: false })

  // El embed to-one de PostgREST llega como objeto; el to-many como array.
  type Fila = {
    id: string
    numero: number
    etapa_compra: string
    descuento_pct: number
    total: number | null
    moneda: string | null
    estado: 'solicitada' | 'confirmada' | 'cancelada'
    facturada_en: string | null
    entregada_en: string | null
    created_at: string
    containers: { nombre: string; etapa: EtapaContainer; fecha_arribo_est: string | null } | null
    container_reserva_items: {
      cantidad: number
      precio_unit: number
      neto_unit: number
      container_items: { codigo_interno: string; titulo: string; variante: string | null } | null
    }[]
  }

  const { user: sesion } = await resolverCanalTienda()
  const mayoristaPorCanal = esMayoristaPorCanal(sesion)

  const lista: ReservaCliente[] = ((reservas ?? []) as unknown as Fila[]).map(r => ({
    id: r.id,
    numero: r.numero,
    viaje: r.containers?.nombre ?? '—',
    etapaViaje: (r.containers?.etapa ?? 'china') as EtapaContainer,
    fechaArribo: r.containers?.fecha_arribo_est ?? null,
    etapaCompra: r.etapa_compra as EtapaContainer,
    descuentoPct: Number(r.descuento_pct ?? 0),
    total: r.total != null ? Number(r.total) : null,
    moneda: r.moneda,
    estado: r.estado,
    facturada: r.facturada_en != null,
    entregada: r.entregada_en != null,
    creada: r.created_at,
    items: (r.container_reserva_items ?? []).map(i => ({
      codigo: i.container_items?.codigo_interno ?? '—',
      titulo: i.container_items?.titulo ?? '—',
      variante: i.container_items?.variante ?? null,
      cantidad: i.cantidad,
      precioUnit: Number(mayoristaPorCanal ? i.neto_unit : i.precio_unit),
    })),
  }))

  return (
    <main className="pt-36 pb-24 px-6 md:px-16 max-w-3xl mx-auto">
      <h1 className="text-3xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Mi cuenta
      </h1>
      <p className="text-base mb-6" style={{ color: 'var(--color-acero-oscuro)' }}>
        Lo que reservaste de mercadería que todavía está en viaje.
      </p>

      <CuentaNav esMayorista={esRolMayorista(profile?.rol)} mostrarReservas />

      <ReservasClient reservas={lista} esMayorista={mayoristaPorCanal} />
    </main>
  )
}
