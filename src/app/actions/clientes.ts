'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'

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
  revalidatePath('/dashboard/admin/clientes')
}

export async function actualizarCanalCliente(clienteId: string, canalId: number | null) {
  const supabase = createServiceClient()
  const { error } = await supabase.from('profiles').update({ canal_id: canalId }).eq('id', clienteId)
  if (error) throw new Error(`Error al actualizar canal: ${error.message}`)
  revalidatePath('/dashboard/admin/clientes')
}
