'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type RolInterno = 'empleado' | 'comisionista'

export async function invitarEmpleado(formData: FormData) {
  const email  = formData.get('email') as string
  const rol    = formData.get('rol') as RolInterno
  const nombre = formData.get('nombre') as string

  if (!email || !rol || !nombre) return { error: 'Completá todos los campos.' }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { rol, nombre },
  })

  if (error) return { error: error.message }

  await supabase.from('profiles').update({ rol, nombre }).eq('id', data.user.id)
  revalidatePath('/dashboard/admin/empleados')
  return { ok: true }
}

export async function desactivarEmpleado(empleadoId: string) {
  const supabase = await createClient()
  await supabase.from('profiles').update({ activo: false }).eq('id', empleadoId)
  revalidatePath('/dashboard/admin/empleados')
}
