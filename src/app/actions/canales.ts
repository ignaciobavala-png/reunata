'use server'

import { createServiceClient } from '@/lib/supabase/server'

export async function toggleProductoCanal(productoId: number, canalId: number, activo: boolean) {
  const supabase = createServiceClient()

  if (activo) {
    const { error } = await supabase
      .from('producto_canales')
      .insert({ producto_id: productoId, canal_id: canalId })
    if (error) throw new Error(`Error al asignar: ${error.message}`)
  } else {
    const { error } = await supabase
      .from('producto_canales')
      .delete()
      .eq('producto_id', productoId)
      .eq('canal_id', canalId)
    if (error) throw new Error(`Error al desasignar: ${error.message}`)
  }
}

export async function asignarCanalMasivo(productoIds: number[], canalId: number, activo: boolean) {
  const supabase = createServiceClient()

  if (activo) {
    const rows = productoIds.map(id => ({ producto_id: id, canal_id: canalId }))
    const { error } = await supabase.from('producto_canales').upsert(rows, { ignoreDuplicates: true })
    if (error) throw new Error(`Error en asignación masiva: ${error.message}`)
  } else {
    const { error } = await supabase
      .from('producto_canales')
      .delete()
      .in('producto_id', productoIds)
      .eq('canal_id', canalId)
    if (error) throw new Error(`Error en desasignación masiva: ${error.message}`)
  }
}
