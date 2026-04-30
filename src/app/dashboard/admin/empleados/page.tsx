import { createClient } from '@/lib/supabase/server'
import { EmpleadosClient } from './EmpleadosClient'

export default async function EmpleadosPage() {
  const supabase = await createClient()

  const { data: empleados } = await supabase
    .from('profiles')
    .select('id, nombre, email, rol, activo, created_at')
    .in('rol', ['master', 'empleado', 'comisionista'])
    .order('rol')
    .order('nombre')

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Equipo interno
      </h1>
      <p className="text-base mb-8" style={{ color: 'var(--color-acero-oscuro)' }}>
        Administradores, empleados y comisionistas con acceso al panel.
      </p>
      <EmpleadosClient empleados={empleados ?? []} />
    </div>
  )
}
