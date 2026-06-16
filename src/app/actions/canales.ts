'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'

export async function toggleProductoCanal(productoId: number, canalId: number, activo: boolean) {
  const supabase = createServiceClient()

  if (activo) {
    // Upsert: si ya existe la fila (con multiplo configurado), la preserva. Si no existe, la crea con multiplo=1.
    const { error } = await supabase
      .from('producto_canales')
      .upsert({ producto_id: productoId, canal_id: canalId }, { onConflict: 'producto_id,canal_id', ignoreDuplicates: true })
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase
      .from('producto_canales')
      .delete()
      .eq('producto_id', productoId)
      .eq('canal_id', canalId)
    if (error) return { ok: false, error: error.message }
  }
  revalidatePath('/dashboard/admin/productos')
  revalidatePath('/tienda', 'layout')
  return { ok: true }
}

export async function actualizarMultiplo(productoId: number, canalId: number, multiplo: number) {
  const supabase = createServiceClient()
  const valor = Math.max(1, Math.round(multiplo))
  const { error } = await supabase
    .from('producto_canales')
    .update({ multiplo: valor })
    .eq('producto_id', productoId)
    .eq('canal_id', canalId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/dashboard/admin/productos')
  revalidatePath('/tienda', 'layout')
  return { ok: true }
}

export async function asignarCanalMasivo(productoIds: number[], canalId: number, activo: boolean) {
  const supabase = createServiceClient()

  if (activo) {
    const rows = productoIds.map(id => ({ producto_id: id, canal_id: canalId }))
    const { error } = await supabase.from('producto_canales').upsert(rows, { ignoreDuplicates: true })
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase
      .from('producto_canales')
      .delete()
      .in('producto_id', productoIds)
      .eq('canal_id', canalId)
    if (error) return { ok: false, error: error.message }
  }
  revalidatePath('/dashboard/admin/productos')
  revalidatePath('/tienda', 'layout')
  return { ok: true }
}
