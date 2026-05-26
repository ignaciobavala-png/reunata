import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Pago confirmado — Reunata' }

export default async function CheckoutExitoPage({
  searchParams,
}: {
  searchParams: Promise<{ external_reference?: string; payment_id?: string }>
}) {
  const { external_reference: pedidoId } = await searchParams

  return (
    <main className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--background)' }}>
      <div className="max-w-md w-full text-center flex flex-col items-center gap-6 py-24">
        <CheckCircle size={56} strokeWidth={1.2} style={{ color: '#10b981' }} />

        <div>
          <h1 className="text-3xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
            ¡Pago confirmado!
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
            Tu pedido fue recibido y el pago procesado correctamente.
            Te vamos a avisar cuando esté en camino.
          </p>
        </div>

        {pedidoId && (
          <p className="text-xs font-mono px-3 py-1.5 rounded" style={{ background: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}>
            Pedido # {pedidoId.slice(0, 8).toUpperCase()}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          {pedidoId && (
            <Link
              href={`/pedidos/${pedidoId}`}
              className="flex-1 py-3 rounded-lg text-sm font-medium text-center transition-opacity hover:opacity-80"
              style={{ background: 'var(--color-granito-oscuro)', color: 'var(--color-acero-brillo)' }}
            >
              Ver mi pedido
            </Link>
          )}
          <Link
            href="/tienda"
            className="flex-1 py-3 rounded-lg text-sm text-center border transition-opacity hover:opacity-80"
            style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
          >
            Seguir comprando
          </Link>
        </div>
      </div>
    </main>
  )
}
