'use server'

import { createServiceClient } from '@/lib/supabase/server'

export interface OfertaPublicItem {
  id: number
  canal: string
  titulo: string
  precio: number
  antes: number
  descuento: number
  img: string
}

export async function getOfertasPublic(): Promise<OfertaPublicItem[]> {
  const supabase = createServiceClient()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const { data: ofertas } = await supabase
    .from('ofertas')
    .select('id, canal, precio_oferta, descuento_porcentaje, producto_id')
    .eq('activo', true)
    .order('orden')

  if (!ofertas?.length) return []

  const productoIds = ofertas.map(o => o.producto_id)

  const [{ data: productos }, { data: fotos }] = await Promise.all([
    supabase.from('productos').select('id, titulo, precio_lista1').in('id', productoIds),
    supabase.from('producto_fotos').select('producto_id, url').eq('destacada', true).in('producto_id', productoIds),
  ])

  const fotoMap = new Map(
    (fotos ?? []).map(f => [f.producto_id, `${supabaseUrl}/storage/v1/object/public/multimedia/${f.url}`])
  )
  const productoMap = new Map((productos ?? []).map(p => [p.id, p]))

  return ofertas.map(o => {
    const prod = productoMap.get(o.producto_id)
    return {
      id: o.id,
      canal: o.canal,
      titulo: prod?.titulo ?? '—',
      precio: o.precio_oferta,
      antes: prod?.precio_lista1 ?? 0,
      descuento: o.descuento_porcentaje,
      img: fotoMap.get(o.producto_id) ?? '',
    }
  })
}

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
