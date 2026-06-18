import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FinanciacionAdminClient } from './FinanciacionAdminClient'

export default async function FinanciacionAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!profile || !['master', 'empleado'].includes(profile.rol)) redirect('/dashboard')

  const { data: solicitudes } = await supabase
    .from('solicitudes_credito')
    .select('id, monto, plazo_dias, garantias, notas, estado, respuesta, created_at, profiles(nombre, email, razon_social)')
    .order('created_at', { ascending: false })

  // Supabase devuelve profiles como array en joins; normalizamos a objeto único
  const datos = (solicitudes ?? []).map(s => ({
    ...s,
    profiles: Array.isArray(s.profiles) ? (s.profiles[0] ?? null) : s.profiles,
  }))

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Solicitudes de financiación
      </h1>
      <p className="text-base mb-8" style={{ color: 'var(--color-acero-oscuro)' }}>
        Revisá y respondé las solicitudes de línea de crédito de mayoristas.
      </p>
      <FinanciacionAdminClient solicitudes={datos as Parameters<typeof FinanciacionAdminClient>[0]['solicitudes']} />
    </div>
  )
}
