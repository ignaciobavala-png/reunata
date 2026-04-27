'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'

export async function aprobarCliente(clienteId: string, aprobado: boolean) {
  const supabase = createServiceClient()
  const { error } = await supabase.from('profiles').update({ aprobado }).eq('id', clienteId)
  if (error) throw new Error(`Error al ${aprobado ? 'aprobar' : 'revocar'}: ${error.message}`)
  revalidatePath('/dashboard/admin/clientes')
}

export async function actualizarCanalCliente(clienteId: string, canalId: number | null) {
  const supabase = createServiceClient()
  const { error } = await supabase.from('profiles').update({ canal_id: canalId }).eq('id', clienteId)
  if (error) throw new Error(`Error al actualizar canal: ${error.message}`)
  revalidatePath('/dashboard/admin/clientes')
}
