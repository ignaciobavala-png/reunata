'use server'

import { createServiceClient } from '@/lib/supabase/server'

export async function guardarDescripcion(productoId: number, descripcion: string | null) {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('productos')
    .update({ descripcion: descripcion?.trim() || null })
    .eq('id', productoId)
  if (error) return { ok: false }
  return { ok: true }
}
