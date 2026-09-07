import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CuentaForm } from './CuentaForm'
import { CuentaNav } from '@/components/cuenta/CuentaNav'
import { esRolMayorista } from '@/lib/roles'

export const metadata: Metadata = { title: 'Mi cuenta', robots: { index: false, follow: false } }

export default async function MiCuentaPage({ searchParams }: { searchParams: Promise<{ guardado?: string; email?: string }> }) {
  const { guardado, email } = await searchParams
  const emailPendiente = email === 'pendiente'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/cuenta')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nombre, email, telefono, cuit_dni, condicion_fiscal, rol, aprobado, razon_social, direccion, localidad, sitio_web, puntos_venta, clientes_activos')
    .eq('id', user.id)
    .single()

  const esMayorista = esRolMayorista(profile?.rol)

  return (
    <main className="pt-36 pb-24 px-6 md:px-16 max-w-2xl mx-auto">
      <h1 className="text-3xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Mi cuenta
      </h1>
      <p className="text-base mb-6" style={{ color: 'var(--color-acero-oscuro)' }}>
        Tus datos de contacto y facturación.
      </p>

      <CuentaNav esMayorista={esMayorista} />

      {guardado && (
        <div className="rounded-lg px-4 py-3 mb-6 text-sm" style={{ background: '#10b98122', color: '#10b981' }}>
          Datos actualizados correctamente.
        </div>
      )}
      {emailPendiente && (
        <div className="rounded-lg px-4 py-3 mb-6 text-sm leading-relaxed" style={{ background: '#f59e0b22', color: '#b45309' }}>
          Para cambiar el email con el que entrás te mandamos un mensaje a la dirección
          nueva y otro a la actual. El cambio se aplica cuando confirmás los dos.
        </div>
      )}

      <CuentaForm profile={profile ?? {}} userId={user.id} />
    </main>
  )
}
