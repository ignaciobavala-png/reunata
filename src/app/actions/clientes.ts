'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function aprobarCliente(clienteId: string, aprobado: boolean) {
  const supabase = await createClient()
  await supabase.from('profiles').update({ aprobado }).eq('id', clienteId)
  revalidatePath('/dashboard/admin/clientes')
}

export async function actualizarCanalCliente(clienteId: string, canalId: number | null) {
  const supabase = await createClient()
  await supabase.from('profiles').update({ canal_id: canalId }).eq('id', clienteId)
  revalidatePath('/dashboard/admin/clientes')
}
