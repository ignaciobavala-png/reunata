import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import type { Metadata } from 'next'
import { ClearCart } from '../exito/ClearCart'

export const metadata: Metadata = { title: 'Comprobante recibido — Reunata' }

// Confirmación para el comprador SIN cuenta que pagó por transferencia.
// No exige login (el invitado no puede ver /pedidos/[id]); el pedido y el
// comprobante ya quedaron registrados para que el admin no pierda el rastro.
export default async function TransferenciaRecibidaPage({
  searchParams,
}: {
  searchParams: Promise<{ numero?: string }>
}) {
  const { numero } = await searchParams

  return (
    <main className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--background)' }}>
      <ClearCart />
      <div className="max-w-md w-full text-center flex flex-col items-center gap-6 py-24">
        <CheckCircle size={56} strokeWidth={1.2} style={{ color: '#10b981' }} />

        <div>
          <h1 className="text-3xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
            ¡Recibimos tu comprobante!
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
            Tu pedido quedó registrado. Revisamos la transferencia y te confirmamos
            por WhatsApp o email. Si hay algún tema con el stock, te avisamos por ahí.
          </p>
        </div>

        {numero && (
          <p className="text-xs font-mono px-3 py-1.5 rounded" style={{ background: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}>
            Pedido #{numero}
          </p>
        )}

        <Link
          href="/tienda"
          className="py-3 px-6 rounded-lg text-sm text-center border transition-opacity hover:opacity-80"
          style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
        >
          Seguir comprando
        </Link>
      </div>
    </main>
  )
}
