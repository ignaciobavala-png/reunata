import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { PedidoRow } from './PedidoRow'
import { ESTADOS_FINALIZADOS } from '@/lib/estadosPedido'

export const metadata: Metadata = { title: 'Mis pedidos', robots: { index: false, follow: false } }

interface PedidoRowData {
  id: string
  numero: number
  estado: string
  medio_pago: string | null
  total_usd: number | null
  created_at: string
}

// A partir de ~10 filas la lista scrollea internamente para que las dos
// columnas (en proceso / finalizados) mantengan sus límites (pedido del tester 2026-07)
const MAX_ALTO_LISTA = '46rem'

function ListaPedidos({ pedidos, mostrarVolverAPedir }: { pedidos: PedidoRowData[]; mostrarVolverAPedir: boolean }) {
  return (
    <div
      className={`rounded-xl border ${pedidos.length > 10 ? 'overflow-y-auto' : 'overflow-hidden'}`}
      style={{ borderColor: 'var(--color-acero-claro)', ...(pedidos.length > 10 ? { maxHeight: MAX_ALTO_LISTA } : {}) }}
      {...(pedidos.length > 10 ? { 'data-lenis-prevent': true } : {})}
    >
      {pedidos.map((p, i) => (
        <PedidoRow
          key={p.id}
          pedido={p}
          mostrarVolverAPedir={mostrarVolverAPedir}
          background={i % 2 === 0 ? 'white' : 'var(--color-acero-brillo)'}
          borderBottom={i < pedidos.length - 1 ? '1px solid var(--color-acero-claro)' : 'none'}
        />
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
              <ListaPedidos pedidos={enProceso} mostrarVolverAPedir={false} />
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
              <ListaPedidos pedidos={finalizados} mostrarVolverAPedir />
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
