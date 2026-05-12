import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CuentaForm } from './CuentaForm'

export default async function MiCuentaPage({ searchParams }: { searchParams: Promise<{ guardado?: string }> }) {
  const { guardado } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nombre, email, telefono, cuit_dni, condicion_fiscal, rol, aprobado, razon_social, direccion, localidad, sitio_web, puntos_venta, clientes_activos')
    .eq('id', user.id)
    .single()

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Mi cuenta
      </h1>
      <p className="text-base mb-8" style={{ color: 'var(--color-acero-oscuro)' }}>
        Tus datos de contacto y facturación.
      </p>

      {guardado && (
        <div className="rounded-lg px-4 py-3 mb-6 text-sm" style={{ background: '#10b98122', color: '#10b981' }}>
          Datos actualizados correctamente.
        </div>
      )}

      <CuentaForm profile={profile ?? {}} userId={user.id} />
    </div>
  )
}
