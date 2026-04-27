'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'

type RolInterno = 'empleado' | 'comisionista'

export async function invitarEmpleado(formData: FormData) {
  const email  = formData.get('email') as string
  const rol    = formData.get('rol') as RolInterno
  const nombre = formData.get('nombre') as string

  if (!email || !rol || !nombre) return { error: 'Completá todos los campos.' }

  const supabase = createServiceClient()

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { rol, nombre },
  })

  if (error) return { error: error.message }

  const { error: updateError } = await supabase.from('profiles').update({ rol, nombre }).eq('id', data.user.id)
  if (updateError) return { error: `Perfil creado pero falló la actualización: ${updateError.message}` }
  revalidatePath('/dashboard/admin/empleados')
  return { ok: true }
}

export async function desactivarEmpleado(empleadoId: string) {
  const supabase = createServiceClient()
  const { error } = await supabase.from('profiles').update({ activo: false }).eq('id', empleadoId)
  if (error) throw new Error(`Error al desactivar: ${error.message}`)
  revalidatePath('/dashboard/admin/empleados')
}
