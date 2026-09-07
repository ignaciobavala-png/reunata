'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { enviarMail, SITIO } from '@/lib/emails/enviar'
import CuentaActivada from '@/emails/cuenta-activada'

export async function aprobarCliente(clienteId: string, aprobado: boolean) {
  const supabase = createServiceClient()

  const update: Record<string, unknown> = { aprobado }

  if (aprobado) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('rol, canal_id')
      .eq('id', clienteId)
      .single()

    // Auto-asignar canal por rol si no tiene uno asignado
    if (profile && !profile.canal_id && profile.rol) {
      const { data: canal } = await supabase
        .from('canales')
        .select('id')
        .eq('slug', profile.rol)
        .single()
      if (!canal) throw new Error(`Canal "${profile.rol}" no encontrado en la tabla canales. Verificá que exista el registro.`)
      update.canal_id = canal.id
    }
  }

  const { error } = await supabase.from('profiles').update(update).eq('id', clienteId)
  if (error) throw new Error(`Error al ${aprobado ? 'aprobar' : 'revocar'}: ${error.message}`)

  // Solo al aprobar: revocar un acceso no se anuncia por mail.
  if (aprobado) {
    const { data: cliente } = await supabase
      .from('profiles')
      .select('email, nombre')
      .eq('id', clienteId)
      .single()

    if (cliente?.email) {
      await enviarMail({
        to: cliente.email,
        subject: 'Tu cuenta de Reunata ya está activa',
        react: CuentaActivada({ nombre: cliente.nombre?.split(' ')[0] ?? 'Hola', sitio: SITIO }),
      })
    }
  }

  revalidatePath('/dashboard/admin/clientes')
}

export async function actualizarCanalCliente(clienteId: string, canalId: number | null) {
  const supabase = createServiceClient()
  const { error } = await supabase.from('profiles').update({ canal_id: canalId }).eq('id', clienteId)
  if (error) throw new Error(`Error al actualizar canal: ${error.message}`)
  revalidatePath('/dashboard/admin/clientes')
}

export async function cambiarEmailCliente(clienteId: string, emailNuevo: string) {
  // Las server actions son endpoints públicos: el guard de la página no alcanza.
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { error: 'Sesión vencida. Volvé a entrar.' }
  const { data: quienLlama } = await authClient.from('profiles').select('rol').eq('id', user.id).single()
  if (!quienLlama || !['master', 'empleado'].includes(quienLlama.rol)) {
    return { error: 'No tenés permiso para cambiar el email de un cliente.' }
  }

  const email = emailNuevo.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'El email no es válido.' }

  const supabase = createServiceClient()

  const { data: ocupado } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .neq('id', clienteId)
    .maybeSingle()
  if (ocupado) return { error: 'Ya hay otra cuenta registrada con ese email.' }

  // 1) El email de acceso (auth.users). email_confirm evita mandarle un mail de
  //    confirmación a la casilla vieja, que es justamente la que ya no se lee.
  const { error: errorAuth } = await supabase.auth.admin.updateUserById(clienteId, {
    email,
    email_confirm: true,
  })
  if (errorAuth) return { error: `No se pudo cambiar el email de acceso: ${errorAuth.message}` }

  // 2) El email de contacto (profiles), el que se usa en pedidos y avisos.
  const { error: errorPerfil } = await supabase.from('profiles').update({ email }).eq('id', clienteId)
  if (errorPerfil) {
    return { error: `El acceso ya quedó con el email nuevo, pero falló el perfil: ${errorPerfil.message}` }
  }

  revalidatePath(`/dashboard/admin/clientes/${clienteId}`)
  revalidatePath('/dashboard/admin/clientes')
  return { ok: true }
}
