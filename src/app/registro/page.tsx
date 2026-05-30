import { Header } from '@/components/layout/Header'
import type { Metadata } from 'next'
import { RegistroForm } from './RegistroForm'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Crear cuenta' }

const BENEFICIOS_MAYORISTA = [
  'Precios por canal según tu tipo de negocio',
  'Catálogo completo con fotos y descripciones',
  'Atención personalizada por WhatsApp',
  'Acceso a novedades y preventas exclusivas',
]

const BENEFICIOS_MINORISTA = [
  'Explorá todo el catálogo de productos',
  'Hacé pedidos desde cualquier dispositivo',
  'Seguimiento de tus compras en tiempo real',
]

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmar?: string; tab?: string; next?: string }>
}) {
  const { confirmar, tab, next } = await searchParams
  const defaultTab = tab === 'mayorista' ? 'mayorista' : 'minorista'
  const esMayorista = defaultTab === 'mayorista'
  const beneficios = esMayorista ? BENEFICIOS_MAYORISTA : BENEFICIOS_MINORISTA

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let headerUser: { nombre: string | null; rol: string } | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('nombre, rol')
      .eq('id', user.id)
      .single()
    if (profile) headerUser = { nombre: profile.nombre, rol: profile.rol }
  }

  if (confirmar) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--color-granito-oscuro)' }}>
        <Header variant="dark" user={headerUser} />
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
      <Header variant="dark" user={headerUser} />

      <main className="flex flex-col lg:flex-row lg:items-start">

        {/* Panel izquierdo — sticky en desktop */}
        <div
          className="hidden lg:flex flex-col items-center justify-center text-center px-16 py-16 w-[42%] lg:sticky lg:top-0 lg:h-screen"
          style={{
            background: 'linear-gradient(160deg, #1a1e1c 0%, #0f1210 60%, #1c2118 100%)',
            borderRight: '1px solid rgba(143,170,156,0.1)',
          }}
        >
          {/* Logo */}
          <div className="mb-10">
            <p
              className="text-6xl tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-acero-brillo)' }}
            >
              Reunata
            </p>
            <div className="mt-3 mx-auto w-10 h-px" style={{ background: 'var(--color-acero)' }} />
          </div>

          {/* Headline */}
          <div className="mb-10">
            <h1
              className="text-4xl leading-snug mb-4"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-acero-brillo)' }}
            >
              {esMayorista
                ? 'Convertite en cliente mayorista'
                : 'Creá tu cuenta y empezá a comprar'}
            </h1>
            <p className="text-base leading-relaxed" style={{ color: 'var(--color-acero)' }}>
              {esMayorista
                ? 'Accedé a precios exclusivos, catálogo completo y atención personalizada para tu negocio.'
                : 'Explorá el catálogo, hacé pedidos y seguí tus compras desde un solo lugar.'}
            </p>
          </div>

          {/* Beneficios */}
          <ul className="flex flex-col gap-4 w-full">
            {beneficios.map((b) => (
              <li key={b} className="flex items-center gap-4">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(143,170,156,0.15)', border: '1px solid rgba(143,170,156,0.3)' }}
                >
                  <Check size={12} style={{ color: 'var(--color-acero)' }} strokeWidth={2.5} />
                </span>
                <span className="text-lg leading-snug text-left" style={{ color: 'var(--color-acero)' }}>
                  {b}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Panel derecho — formulario */}
        <div
          className="flex-1 flex flex-col px-6 pt-8 pb-16 lg:px-16 lg:py-16"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <div
            className="w-full max-w-xl mx-auto rounded-2xl px-6 py-8 lg:px-10"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(143,170,156,0.12)',
            }}
          >
            <RegistroForm defaultTab={defaultTab} next={next} />
          </div>
        </div>

      </main>
    </div>
  )
}
