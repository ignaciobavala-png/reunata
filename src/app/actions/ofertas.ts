'use server'

import { createServiceClient } from '@/lib/supabase/server'

export async function agregarOferta(
  canal: string,
  productoId: number,
  precioOferta: number,
  descuento: number
) {
  const supabase = createServiceClient()
  const { error } = await supabase.from('ofertas').insert({
    canal,
    producto_id: productoId,
    precio_oferta: precioOferta,
    descuento_porcentaje: descuento,
  })
  if (error) throw new Error(error.message)
}

export async function eliminarOferta(id: number) {
  const supabase = createServiceClient()
  const { error } = await supabase.from('ofertas').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function actualizarOferta(
  id: number,
  data: {
    precio_oferta?: number
    descuento_porcentaje?: number
    orden?: number
    activo?: boolean
  }
) {
  const supabase = createServiceClient()
  const { error } = await supabase.from('ofertas').update(data).eq('id', id)
  if (error) throw new Error(error.message)
}
