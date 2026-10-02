'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { SITIO } from '@/lib/emails/enviar'
import { OPCIONES_ROL_INTERNO } from '@/lib/roles'

// Estas acciones escriben con la service key, así que el permiso se chequea acá:
// sin esto cualquier sesión podía invitar o desactivar usuarios internos.
async function exigirMaster() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Sin sesión' }
  const { data: perfil } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'master') return { ok: false as const, error: 'Solo un master puede gestionar el equipo.' }
  return { ok: true as const, userId: user.id }
}

function opcion(valor: string) {
  return OPCIONES_ROL_INTERNO.find(o => o.valor === valor)
}

export async function invitarEmpleado(formData: FormData) {
  const permiso = await exigirMaster()
  if (!permiso.ok) return { error: permiso.error }

  const email  = formData.get('email') as string
  const elegido = opcion(formData.get('rol') as string)
  const nombre = formData.get('nombre') as string

  if (!email || !elegido || !nombre) return { error: 'Completá todos los campos.' }
  const { rol, area } = elegido

  const supabase = createServiceClient()

  // Sin redirectTo, GoTrue manda al Site URL y el link de invitación no llega
  // a la ruta que lo verifica. Va sin query string: la plantilla le agrega
  // `?token_hash=...&type=invite`.
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { rol, nombre },
    redirectTo: `${SITIO}/auth/confirm`,
  })

  if (error) return { error: error.message }

  const { error: updateError } = await supabase.from('profiles').update({ rol, area, nombre }).eq('id', data.user.id)
  if (updateError) return { error: `Perfil creado pero falló la actualización: ${updateError.message}` }
  revalidatePath('/dashboard/admin/empleados')
  return { ok: true }
}

/**
 * Cambia el rol de un usuario interno (Master, Administración, Depósito,
 * Comisionista). Nadie se cambia el rol a sí mismo: un master que se baja a
 * Depósito por error se queda sin poder volver.
 */
export async function cambiarRolEmpleado(empleadoId: string, valor: string): Promise<{ ok: boolean; error?: string }> {
  const permiso = await exigirMaster()
  if (!permiso.ok) return { ok: false, error: permiso.error }
  if (empleadoId === permiso.userId) return { ok: false, error: 'No podés cambiar tu propio rol.' }

  const elegido = opcion(valor)
  if (!elegido) return { ok: false, error: 'Rol inválido.' }

  const supabase = createServiceClient()
  const { data: actual } = await supabase.from('profiles').select('rol').eq('id', empleadoId).single()
  // Solo entre usuarios internos: un cliente no se convierte en empleado desde acá.
  if (!actual || !OPCIONES_ROL_INTERNO.some(o => o.rol === actual.rol)) {
    return { ok: false, error: 'El usuario no es parte del equipo interno.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ rol: elegido.rol, area: elegido.area })
    .eq('id', empleadoId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/dashboard/admin/empleados')
  return { ok: true }
}

export async function desactivarEmpleado(empleadoId: string) {
  const permiso = await exigirMaster()
  if (!permiso.ok) throw new Error(permiso.error)

  const supabase = createServiceClient()
  const { error } = await supabase.from('profiles').update({ activo: false }).eq('id', empleadoId)
  if (error) throw new Error(`Error al desactivar: ${error.message}`)
  revalidatePath('/dashboard/admin/empleados')
}
