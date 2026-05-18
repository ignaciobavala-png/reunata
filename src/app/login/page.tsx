import { Header } from '@/components/layout/Header'
import type { Metadata } from 'next'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = { title: 'Ingresar' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-granito-oscuro)' }}>
      <Header />
      <main className="min-h-screen flex items-center justify-center px-6 pt-24 pb-16">
        <div className="w-full max-w-sm">

          <div className="mb-10">
            <h1 className="text-4xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-acero-brillo)' }}>
              Bienvenido
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-acero)' }}>
              Ingresá a tu cuenta para ver el catálogo mayorista.
            </p>
          </div>

          <LoginForm error={error} next={next} />
        </div>
      </main>
    </div>
  )
}
