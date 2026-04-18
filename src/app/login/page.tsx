import { Header } from '@/components/layout/Header'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ingresar',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-granito-oscuro)' }}>
      <Header />
      <main className="min-h-screen flex items-center justify-center px-6 pt-24 pb-16">
        <div className="w-full max-w-sm">

          {/* Heading */}
          <div className="mb-10">
            <h1
              className="text-4xl mb-2"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-acero-brillo)' }}
            >
              Bienvenido
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-acero)' }}>
              Ingresá a tu cuenta para ver el catálogo mayorista.
            </p>
          </div>

          {/* Form */}
          <form className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-xs tracking-widest uppercase"
                style={{ color: 'var(--color-acero-claro)' }}
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="tu@email.com"
                className="w-full rounded-md px-4 py-3 text-sm outline-none transition-colors duration-200"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(168,176,187,0.25)',
                  color: 'var(--color-acero-brillo)',
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs tracking-widest uppercase"
                  style={{ color: 'var(--color-acero-claro)' }}
                >
                  Contraseña
                </label>
                <Link
                  href="/recuperar-contrasena"
                  className="text-xs transition-colors duration-200 hover:opacity-80"
                  style={{ color: 'var(--color-acero)' }}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full rounded-md px-4 py-3 text-sm outline-none transition-colors duration-200"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(168,176,187,0.25)',
                  color: 'var(--color-acero-brillo)',
                }}
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full text-xs tracking-widest uppercase py-3.5 rounded-md transition-colors duration-200"
              style={{
                background: 'var(--color-acero-claro)',
                color: 'var(--color-granito-oscuro)',
              }}
            >
              Ingresar
            </button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center gap-4">
            <div className="flex-1 h-px" style={{ background: 'rgba(168,176,187,0.2)' }} />
            <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>¿Sos nuevo?</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(168,176,187,0.2)' }} />
          </div>

          {/* Register CTA */}
          <Link
            href="/registro"
            className="block w-full text-center text-xs tracking-widest uppercase py-3.5 rounded-md transition-colors duration-200 hover:opacity-80"
            style={{
              border: '1px solid rgba(168,176,187,0.35)',
              color: 'var(--color-acero-claro)',
            }}
          >
            Crear cuenta
          </Link>

        </div>
      </main>
    </div>
  )
}
