'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

const ROLES_ADMIN = ['master', 'empleado']

async function verificarRolAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()
  return ROLES_ADMIN.includes(perfil?.rol ?? '')
}

export async function guardarDescripcion(productoId: number, descripcion: string | null) {
  if (!await verificarRolAdmin()) return { ok: false, error: 'Sin permisos.' }
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('productos')
    .update({ descripcion: descripcion?.trim() || null })
    .eq('id', productoId)
  if (error) return { ok: false }
  return { ok: true }
}

export async function guardarDimensionesEnvio(
  productoId: number,
  data: { alto: number | null; ancho: number | null; largo: number | null; peso: number | null; enviar_solo: boolean }
) {
  if (!await verificarRolAdmin()) return { ok: false, error: 'Sin permisos.' }
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('productos')
    .update({
      alto: data.alto,
      ancho: data.ancho,
      largo: data.largo,
      peso: data.peso,
      enviar_solo: data.enviar_solo,
    })
    .eq('id', productoId)
  if (error) return { ok: false }
  return { ok: true }
}
