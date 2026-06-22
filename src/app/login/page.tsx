import { Header } from '@/components/layout/Header'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LoginForm } from './LoginForm'
import { getHeaderData } from '@/lib/header'

const ROLES_INTERNOS = ['master', 'empleado', 'comisionista']

export const metadata: Metadata = { title: 'Ingresar' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string; email?: string }> }) {
  const { error, next, email } = await searchParams
  const { headerUser, headerCategorias } = await getHeaderData()

  if (headerUser) {
    redirect(ROLES_INTERNOS.includes(headerUser.rol) ? '/dashboard/admin' : '/')
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-granito-oscuro)' }}>
      <Header variant="dark" user={headerUser} categorias={headerCategorias} />
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

          <LoginForm error={error} next={next} email={email} />
        </div>
      </main>
    </div>
  )
}
