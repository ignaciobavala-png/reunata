import { Header } from '@/components/layout/Header'
import type { Metadata } from 'next'
import { RegistroForm } from './RegistroForm'

export const metadata: Metadata = { title: 'Crear cuenta' }

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmar?: string; tab?: string }>
}) {
  const { confirmar, tab } = await searchParams
  const defaultTab = tab === 'mayorista' ? 'mayorista' : 'minorista'

  if (confirmar) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--color-granito-oscuro)' }}>
        <Header />
        <main className="min-h-screen flex items-center justify-center px-6 pt-24 pb-16">
          <div className="w-full max-w-sm text-center">
            <h1 className="text-3xl mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-acero-brillo)' }}>
              Revisá tu email
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-acero)' }}>
              Te enviamos un link de confirmación. Hacé clic en él para activar tu cuenta y luego podés ingresar.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-granito-oscuro)' }}>
      <Header />
      <main className="min-h-screen flex items-center justify-center px-6 pt-24 pb-16">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-4xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-acero-brillo)' }}>
              Crear cuenta
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-acero)' }}>
              Registrate para ver precios, stock y hacer pedidos.
            </p>
          </div>
          <RegistroForm defaultTab={defaultTab} />
        </div>
      </main>
    </div>
  )
}
