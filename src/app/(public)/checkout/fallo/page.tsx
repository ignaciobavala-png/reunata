import Link from 'next/link'
import { XCircle } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Pago fallido — Reunata' }

export default function CheckoutFalloPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--background)' }}>
      <div className="max-w-md w-full text-center flex flex-col items-center gap-6 py-24">
        <XCircle size={56} strokeWidth={1.2} style={{ color: '#ef4444' }} />

        <div>
          <h1 className="text-3xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
            No se pudo procesar el pago
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
            El pago no fue aprobado. Podés intentarlo de nuevo con otro método de pago
            o contactarnos si el problema persiste.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Link
            href="/tienda"
            className="flex-1 py-3 rounded-lg text-sm font-medium text-center transition-opacity hover:opacity-80"
            style={{ background: 'var(--color-granito-oscuro)', color: 'var(--color-acero-brillo)' }}
          >
            Volver a la tienda
          </Link>
          <a
            href="https://wa.me/5491132720974"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 rounded-lg text-sm text-center border transition-opacity hover:opacity-80"
            style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
          >
            Contactar por WhatsApp
          </a>
        </div>
      </div>
    </main>
  )
}
