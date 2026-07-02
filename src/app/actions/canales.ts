'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'

export async function crearCanal(payload: {
  nombre: string
  slug: string
  categoria_comercial: 'minorista' | 'mayorista' | 'especial'
}): Promise<{ ok: boolean; id?: number; error?: string }> {
  const supabase = createServiceClient()

  // La lista de precios se deriva de la categoría comercial — no es un input
  // independiente, para que no puedan quedar desincronizados (ver CHECK en BD).
  const listaPrecios = payload.categoria_comercial === 'minorista' ? 'precio_lista5' : 'precio_lista3'

  const { data: canal, error: canalErr } = await supabase
    .from('canales')
    .insert({
      nombre: payload.nombre.trim(),
      slug: payload.slug.trim(),
      lista_precios: listaPrecios,
      categoria_comercial: payload.categoria_comercial,
      activo: true,
    })
    .select('id')
    .single()

  if (canalErr || !canal) {
    return { ok: false, error: canalErr?.message ?? 'Error al crear el canal.' }
  }

  // Crear fila de configuración con defaults para que el drawer funcione de inmediato
  await supabase.from('canales_config').insert({
    canal_id: canal.id,
    pagos_habilitados: {},
    cuotas_mp_sin_interes: 1,
    desc_transferencia_pct: 0,
    desc_efectivo_pct: 0,
    recargo_transf_blanco_pct: 21,
    desc_autogestion_primera_pct: 0,
    desc_autogestion_siguientes_pct: 0,
    envio_gratis_desde: null,
    envio_flex_activo: false,
    envio_amba_gratis_desde: null,
    minimo_compra: null,
    minimo_compra_trimestral: null,
    dias_vencimiento_pedido: 7,
    mostrar_direccion_en_web: false,
    direccion_negocio: null,
    whatsapp_tipo: 'bot',
    premio_diversidad_items_min: null,
    premio_diversidad_pct: null,
    premio_monto_trimestral_min: null,
    premio_monto_trimestral_pct: null,
    premio_periodicidad_dias_max: null,
    premio_periodicidad_pct: null,
    marketing_dias_recontacto: 90,
    marketing_mensaje_recontacto: '',
    marketing_link_agendamiento: '',
  })

  revalidatePath('/dashboard/admin/productos')
  return { ok: true, id: canal.id }
}

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
