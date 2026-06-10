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

export async function guardarDimensionesEnvio(
  productoId: number,
  data: { alto: number | null; ancho: number | null; largo: number | null; peso: number | null; enviar_solo: boolean }
) {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('productos')
    .update({
      alto: data.alto,
      ancho: data.ancho,
      largo: data.largo,
      peso: data.peso,
      enviar_solo: data.enviar_solo,
    })
    .eq('id', productoId)
  if (error) return { ok: false }
  return { ok: true }
}
