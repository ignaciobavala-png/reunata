'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function actualizarPerfil(userId: string, formData: FormData) {
  const supabase = await createClient()
  await supabase.from('profiles').update({
    nombre:           formData.get('nombre') as string,
    email:            formData.get('email') as string,
    telefono:         formData.get('telefono') as string,
    cuit_dni:         formData.get('cuit_dni') as string,
    condicion_fiscal: formData.get('condicion_fiscal') as string,
  }).eq('id', userId)
  revalidatePath('/dashboard/cliente/cuenta')
}
