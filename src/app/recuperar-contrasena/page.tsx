import { Header } from '@/components/layout/Header'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Recuperar contraseña — Reunata' }

export default function RecuperarContrasenaPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-granito-oscuro)' }}>
      <Header />
      <main className="min-h-screen flex items-center justify-center px-6 pt-24 pb-16">
        <div className="w-full max-w-sm">
          <div className="mb-10">
            <h1 className="text-4xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-acero-brillo)' }}>
              Recuperar contraseña
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-acero)' }}>
              La recuperación de contraseña por email estará disponible próximamente.
            </p>
          </div>

          <div
            className="rounded-xl px-6 py-5 mb-8 text-sm leading-relaxed"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-acero-claro)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Por ahora, para restablecer tu contraseña escribinos por WhatsApp o al email de soporte indicando la dirección con la que te registraste.
          </div>

          <a
            href="https://wa.me/5491132720974"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-3 rounded-xl text-sm font-medium mb-4 transition-opacity duration-200 hover:opacity-90"
            style={{ background: 'var(--color-acero-brillo)', color: 'var(--color-granito-oscuro)' }}
          >
            Contactar por WhatsApp
          </a>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--color-acero-oscuro)' }}>
            ¿Recordaste la contraseña?{' '}
            <Link href="/login" className="transition-opacity hover:opacity-80" style={{ color: 'var(--color-acero-claro)' }}>
              Ingresá acá
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
