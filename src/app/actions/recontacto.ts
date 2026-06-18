'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function marcarContactado(clienteId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('profiles')
    .update({ requiere_recontacto: false })
    .eq('id', clienteId)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/admin/recontacto')
  return { ok: true }
}
