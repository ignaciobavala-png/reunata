'use server'

import { createClient } from '@/lib/supabase/server'

export async function toggleProductoCanal(productoId: number, canalId: number, activo: boolean) {
  const supabase = await createClient()

  if (activo) {
    await supabase
      .from('producto_canales')
      .insert({ producto_id: productoId, canal_id: canalId })
  } else {
    await supabase
      .from('producto_canales')
      .delete()
      .eq('producto_id', productoId)
      .eq('canal_id', canalId)
  }
}

export async function asignarCanalMasivo(productoIds: number[], canalId: number, activo: boolean) {
  const supabase = await createClient()

  if (activo) {
    const rows = productoIds.map(id => ({ producto_id: id, canal_id: canalId }))
    await supabase.from('producto_canales').upsert(rows, { ignoreDuplicates: true })
  } else {
    await supabase
      .from('producto_canales')
      .delete()
      .in('producto_id', productoIds)
      .eq('canal_id', canalId)
  }
}
