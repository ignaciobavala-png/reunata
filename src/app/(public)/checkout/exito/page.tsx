import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ClearCart } from './ClearCart'

export const metadata: Metadata = { title: 'Pago confirmado — Reunata' }

export default async function CheckoutExitoPage({
  searchParams,
}: {
  searchParams: Promise<{
    external_reference?: string
    payment_id?: string
    status?: string
    collection_status?: string
  }>
}) {
  const { external_reference: pedidoId, status, collection_status } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let numeroPedido: number | null = null
  let estadoPedido: string | null = null
  if (pedidoId) {
    const { data } = await supabase.from('pedidos').select('numero, estado').eq('id', pedidoId).single()
    numeroPedido = data?.numero ?? null
    estadoPedido = data?.estado ?? null
  }

  // Solo vaciar el carrito si el pago está realmente aprobado. MP rebota al usuario
  // a esta URL también cuando abandona el checkout (botón "Volver"); sin este guard,
  // ClearCart le borraba el carrito completo sin haber pagado.
  const pagoAprobado =
    status === 'approved' ||
    collection_status === 'approved' ||
    estadoPedido === 'pago_confirmado'

  return (
    <main className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--background)' }}>
      {pagoAprobado && <ClearCart />}
      <div className="max-w-md w-full text-center flex flex-col items-center gap-6 py-24">
        <CheckCircle size={56} strokeWidth={1.2} style={{ color: pagoAprobado ? '#10b981' : '#f59e0b' }} />

        <div>
          <h1 className="text-3xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
            {pagoAprobado ? '¡Gracias por tu compra!' : 'Tu pago quedó pendiente'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
            {pagoAprobado
              ? (user
                  ? 'Tu pedido fue recibido. La confirmación del pago puede demorar unos minutos en procesarse.'
                  : 'Tu pedido fue recibido. Mercado Pago te enviará la confirmación a tu email en breve.')
              : 'Todavía no registramos el pago. Si no llegaste a pagar, tu carrito sigue disponible para que lo intentes de nuevo.'
            }
          </p>
        </div>

        {numeroPedido && (
          <p className="text-xs font-mono px-3 py-1.5 rounded" style={{ background: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}>
            Pedido #{numeroPedido}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          {user && pedidoId && (
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
