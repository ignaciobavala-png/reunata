import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CuentaNav } from '@/components/cuenta/CuentaNav'
import { FinanciacionClient } from './FinanciacionClient'

export const metadata: Metadata = { title: 'Financiación', robots: { index: false, follow: false } }

const MAYORISTAS = ['distribuidor', 'local', 'mercha']

export default async function FinanciacionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/cuenta/financiacion')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!profile || !MAYORISTAS.includes(profile.rol)) redirect('/cuenta')

  const { data: solicitudes } = await supabase
    .from('solicitudes_credito')
    .select('id, monto, plazo_dias, garantias, notas, estado, respuesta, created_at')
    .eq('cliente_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <main className="pt-36 pb-24 px-6 md:px-16 max-w-2xl mx-auto">
      <h1 className="text-3xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Mi cuenta
      </h1>
      <p className="text-base mb-6" style={{ color: 'var(--color-acero-oscuro)' }}>
        Solicitá una línea de crédito para operar en cuenta corriente.
      </p>

      <CuentaNav esMayorista />

      <FinanciacionClient solicitudes={solicitudes ?? []} />
    </main>
  )
}
