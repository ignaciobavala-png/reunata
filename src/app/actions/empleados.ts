'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { SITIO } from '@/lib/emails/enviar'

type RolInterno = 'empleado' | 'comisionista'

export async function invitarEmpleado(formData: FormData) {
  const email  = formData.get('email') as string
  const rol    = formData.get('rol') as RolInterno
  const nombre = formData.get('nombre') as string

  if (!email || !rol || !nombre) return { error: 'Completá todos los campos.' }

  const supabase = createServiceClient()

  // Sin redirectTo, GoTrue manda al Site URL y el link de invitación no llega
  // a la ruta que lo verifica. Va sin query string: la plantilla le agrega
  // `?token_hash=...&type=invite`.
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { rol, nombre },
    redirectTo: `${SITIO}/auth/confirm`,
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
