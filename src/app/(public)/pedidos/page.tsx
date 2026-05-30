import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ShoppingCart, ChevronRight } from 'lucide-react'

export const metadata: Metadata = { title: 'Mis pedidos', robots: { index: false, follow: false } }

const ESTADO_LABEL: Record<string, string> = {
  pendiente_pago:     'Pendiente de pago',
  comprobante_subido: 'Comprobante enviado',
  pago_confirmado:    'Pago confirmado',
  en_preparacion:     'En preparación',
  enviado:            'Enviado',
  entregado:          'Entregado',
  cancelado:          'Cancelado',
}

const ESTADO_COLOR: Record<string, { bg: string; text: string }> = {
  pendiente_pago:     { bg: '#f59e0b22', text: '#f59e0b' },
  comprobante_subido: { bg: '#6366f122', text: '#6366f1' },
  pago_confirmado:    { bg: '#0ea5e922', text: '#0ea5e9' },
  en_preparacion:     { bg: '#8b5cf622', text: '#8b5cf6' },
  enviado:            { bg: '#06b6d422', text: '#06b6d4' },
  entregado:          { bg: '#10b98122', text: '#10b981' },
  cancelado:          { bg: '#ef444422', text: '#ef4444' },
}

export default async function MisPedidosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/pedidos')

  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('id, estado, medio_pago, total_usd, created_at')
    .eq('cliente_id', user.id)
    .neq('estado', 'borrador')
    .order('created_at', { ascending: false })

  return (
    <main className="pt-36 pb-24 px-6 md:px-16 max-w-3xl mx-auto">
      <h1 className="text-3xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Mis pedidos
      </h1>
      <p className="text-base mb-8" style={{ color: 'var(--color-acero-oscuro)' }}>
        {pedidos?.length ?? 0} pedidos en total
      </p>

      {pedidos && pedidos.length > 0 ? (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-acero-claro)' }}>
          {pedidos.map((p, i) => {
            const col = ESTADO_COLOR[p.estado] ?? { bg: '#88888822', text: '#888' }
            return (
              <Link
                key={p.id}
                href={`/pedidos/${p.id}`}
                className="flex items-center justify-between px-5 py-4 transition-colors duration-100"
                style={{
                  background: i % 2 === 0 ? 'white' : 'var(--color-acero-brillo)',
                  borderBottom: i < pedidos.length - 1 ? '1px solid var(--color-acero-claro)' : 'none',
                }}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-mono" style={{ color: 'var(--color-acero-oscuro)' }}>
                    #{p.id.slice(-8).toUpperCase()}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
                    {new Date(p.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm px-2.5 py-1 rounded-full" style={{ background: col.bg, color: col.text }}>
                    {ESTADO_LABEL[p.estado] ?? p.estado}
                  </span>
                  {p.total_usd != null && (
                    <span className="text-base font-medium" style={{ color: 'var(--foreground)' }}>
                      u$s {Number(p.total_usd).toFixed(2)}
                    </span>
                  )}
                  <ChevronRight size={14} style={{ color: 'var(--color-acero)' }} />
                </div>
              </Link>
            )
          })}
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
