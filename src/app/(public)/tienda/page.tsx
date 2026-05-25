export const dynamic = 'force-dynamic'

import { Hero } from '@/components/sections/Hero'
import { CategoryGallery } from '@/components/sections/CategoryGallery'
import { InstagramSlider } from '@/components/sections/InstagramSlider'
import { PromotionalBanner } from '@/components/sections/PromotionalBanner'
import { ProductSlider } from '@/components/sections/ProductSlider'
import { PromoTicker } from '@/components/sections/PromoTicker'
import { createServiceClient } from '@/lib/supabase/server'
import { resolverCanalTienda, getProductosDelCanal } from '@/lib/tienda'
import { PendingApproval } from '@/components/sections/PendingApproval'

export default async function TiendaPage() {
  const supabase = createServiceClient()

  const [canalInfo, { data: bannerData }, { data: postsInstagram }] = await Promise.all([
    resolverCanalTienda(),
    supabase.from('banners').select('url, titulo, link_url').eq('activo', true).order('id', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('comunidad_fotos').select('id, thumbnail_url, caption, username, permalink, url_instagram').eq('activo', true).order('orden'),
  ])

  const { user, canalId, listaPrecio, mostrarPrecios, pendienteAprobacion } = canalInfo

  if (pendienteAprobacion) return <PendingApproval nombre={user?.nombre} />
  const idsCanal = await getProductosDelCanal(canalId)

  const { data: fotosDestacadas } = await supabase
    .from('producto_fotos')
    .select('id, url, producto_id, orden, productos(titulo, codigo_interno, precio_lista1, precio_lista2, precio_lista3, precio_lista5)')
    .eq('destacada', true)
    .in('producto_id', idsCanal.length > 0 ? idsCanal : [-1])
    .order('orden')

  const banner = bannerData ? {
    url: bannerData.url,
    titulo: bannerData.titulo,
    linkUrl: bannerData.link_url,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  } : null

  const fotos = (fotosDestacadas ?? []).map((f) => {
    const producto = Array.isArray(f.productos) ? f.productos[0] : null
    const precio = mostrarPrecios && listaPrecio && producto
      ? (producto[listaPrecio as keyof typeof producto] as number | null) ?? null
      : null
    return {
      id: f.id,
      url: f.url,
      producto_id: f.producto_id,
      titulo: producto?.titulo ?? '',
      codigo_interno: producto?.codigo_interno ?? '',
      precio,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    }
  })

  return (
    <>
      <Hero />
      <PromoTicker />
      <CategoryGallery />
      <ProductSlider fotos={fotos} />
      <InstagramSlider posts={postsInstagram ?? []} />
      <PromotionalBanner banner={banner} />
    </>
  )
}
