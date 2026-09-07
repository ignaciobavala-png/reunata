'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { SITIO } from '@/lib/emails/enviar'

export async function actualizarPerfil(userId: string, formData: FormData) {
  const supabase = await createClient()

  // `email` no entra acá: es el mail con el que la persona entra al sitio, y
  // cambiarlo a mano en profiles lo desincronizaba de auth.users. Se pide más
  // abajo con updateUser(), que exige confirmarlo, y un trigger lo baja a
  // profiles recién cuando el cambio se aplica de verdad.
  const updates: Record<string, unknown> = {
    nombre:           formData.get('nombre') as string,
    telefono:         formData.get('telefono') as string,
    cuit_dni:         formData.get('cuit_dni') as string,
    condicion_fiscal: formData.get('condicion_fiscal') as string,
  }

  // Campos mayoristas: se actualizan solo si el form los incluye
  for (const campo of ['razon_social', 'direccion', 'localidad', 'sitio_web']) {
    const val = formData.get(campo)
    if (val !== null) updates[campo] = (val as string) || null
  }
  const pv = formData.get('puntos_venta')
  if (pv !== null) updates.puntos_venta = pv ? Number(pv) : null
  const ca = formData.get('clientes_activos')
  if (ca !== null) updates.clientes_activos = ca ? Number(ca) : null

  const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
  if (error) throw new Error(error.message)

  const emailNuevo = ((formData.get('email') as string) ?? '').trim().toLowerCase()
  const { data: { user } } = await supabase.auth.getUser()
  let emailPendiente = false

  if (emailNuevo && user && emailNuevo !== user.email?.toLowerCase()) {
    const { error: errorEmail } = await supabase.auth.updateUser(
      { email: emailNuevo },
      { emailRedirectTo: `${SITIO}/auth/confirm` },
    )
    // El resto del perfil ya se guardó: un mail rechazado (ya en uso, inválido)
    // no tiene por qué tirar abajo el resto del formulario.
    if (errorEmail) {
      console.error('[cuenta] cambio de email rechazado:', errorEmail.message)
    } else {
      emailPendiente = true
    }
  }

  revalidatePath('/dashboard/cliente/cuenta')
  revalidatePath('/cuenta')
  return { emailPendiente }
}
