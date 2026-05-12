'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function actualizarPerfil(userId: string, formData: FormData) {
  const supabase = await createClient()

  const updates: Record<string, unknown> = {
    nombre:           formData.get('nombre') as string,
    email:            formData.get('email') as string,
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
  revalidatePath('/dashboard/cliente/cuenta')
}
