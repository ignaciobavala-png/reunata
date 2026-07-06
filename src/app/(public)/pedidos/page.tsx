import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ShoppingCart, ChevronRight } from 'lucide-react'
import { formatPrecio } from '@/lib/utils'
import { VolverAPedirButton } from './VolverAPedirButton'
import { ESTADOS_PEDIDO, estadoLabel, estadoColor, ESTADOS_FINALIZADOS } from '@/lib/estadosPedido'

export const metadata: Metadata = { title: 'Mis pedidos', robots: { index: false, follow: false } }

interface PedidoRow {
  id: string
  numero: number
  estado: string
  medio_pago: string | null
  total_usd: number | null
  created_at: string
}

function ListaPedidos({ pedidos, mostrarVolverAPedir }: { pedidos: PedidoRow[]; mostrarVolverAPedir: boolean }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-acero-claro)' }}>
      {pedidos.map((p, i) => {
        const col = estadoColor(p.estado)
        return (
          <div
            key={p.id}
            className="flex items-center px-5 py-4 gap-3 transition-colors duration-100"
            style={{
              background: i % 2 === 0 ? 'white' : 'var(--color-acero-brillo)',
              borderBottom: i < pedidos.length - 1 ? '1px solid var(--color-acero-claro)' : 'none',
            }}
          >
            <Link href={`/pedidos/${p.id}`} className="flex items-center justify-between flex-1 min-w-0">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-mono" style={{ color: 'var(--color-acero-oscuro)' }}>
                  #{p.numero}
                </span>
                <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
                  {new Date(p.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm px-2.5 py-1 rounded-full" style={{ background: col.bg, color: col.text }}>
                  {estadoLabel(p.estado)}
                </span>
                {p.total_usd != null && (
                  <span className="text-base font-medium" style={{ color: 'var(--foreground)' }}>
                    {formatPrecio(Number(p.total_usd))}
                  </span>
                )}
              </div>
            </Link>
            {mostrarVolverAPedir && <VolverAPedirButton pedidoId={p.id} compact />}
            <Link href={`/pedidos/${p.id}`} aria-label={`Ver pedido #${p.numero}`}>
              <ChevronRight size={14} style={{ color: 'var(--color-acero)' }} />
            </Link>
          </div>
        )
      })}
    </div>
  )
}

// Agrupa por estado siguiendo el orden del pipeline (ESTADOS_PEDIDO) — dentro de
// cada grupo se conserva el orden por fecha ya traído del server (más reciente primero).
function agruparPorEstado(pedidos: PedidoRow[]): { estado: string; pedidos: PedidoRow[] }[] {
  return Object.keys(ESTADOS_PEDIDO)
    .map(estado => ({ estado, pedidos: pedidos.filter(p => p.estado === estado) }))
    .filter(g => g.pedidos.length > 0)
}

function SeccionPedidos({ pedidos, mostrarVolverAPedir }: { pedidos: PedidoRow[]; mostrarVolverAPedir: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      {agruparPorEstado(pedidos).map(({ estado, pedidos: grupo }) => (
        <div key={estado}>
          <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-acero-oscuro)' }}>
            {estadoLabel(estado)} <span style={{ color: 'var(--color-acero)' }}>({grupo.length})</span>
          </h3>
          <ListaPedidos pedidos={grupo} mostrarVolverAPedir={mostrarVolverAPedir} />
        </div>
      ))}
    </div>
  )
}

export default async function MisPedidosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/pedidos')

  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('id, numero, estado, medio_pago, total_usd, created_at')
    .eq('cliente_id', user.id)
    .order('created_at', { ascending: false })

  const todos = pedidos ?? []
  const enProceso = todos.filter(p => !ESTADOS_FINALIZADOS.includes(p.estado))
  const finalizados = todos.filter(p => ESTADOS_FINALIZADOS.includes(p.estado))

  return (
    <main className="pt-36 pb-24 px-6 md:px-16 max-w-6xl mx-auto">
      <h1 className="text-3xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Mis pedidos
      </h1>
      <p className="text-base mb-8" style={{ color: 'var(--color-acero-oscuro)' }}>
        {todos.length} pedidos en total
      </p>

      {todos.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
              En proceso {enProceso.length > 0 && <span style={{ color: 'var(--color-acero-oscuro)' }}>({enProceso.length})</span>}
            </h2>
            {enProceso.length > 0 ? (
              <SeccionPedidos pedidos={enProceso} mostrarVolverAPedir={false} />
            ) : (
              <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
                No tenés pedidos en proceso.
              </p>
            )}
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
              Finalizados {finalizados.length > 0 && <span style={{ color: 'var(--color-acero-oscuro)' }}>({finalizados.length})</span>}
            </h2>
            {finalizados.length > 0 ? (
              <SeccionPedidos pedidos={finalizados} mostrarVolverAPedir />
            ) : (
              <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
                Todavía no tenés pedidos finalizados.
              </p>
            )}
          </section>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <ShoppingCart size={32} strokeWidth={1.2} style={{ color: 'var(--color-acero-claro)' }} />
          <p className="text-base" style={{ color: 'var(--color-acero-oscuro)' }}>
            Todavía no realizaste ningún pedido.
          </p>
          <Link
            href="/tienda"
            className="text-sm px-4 py-2 rounded-lg"
            style={{ background: 'var(--color-granito)', color: 'var(--color-acero-brillo)' }}
          >
            Ver tienda
          </Link>
        </div>
      )}
    </main>
  )
}
