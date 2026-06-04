export const dynamic = 'force-dynamic'

import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Hero } from '@/components/sections/Hero'
import { CategoryGallery } from '@/components/sections/CategoryGallery'
import { InstagramSlider } from '@/components/sections/InstagramSlider'
import { PromotionalBanner } from '@/components/sections/PromotionalBanner'
import { ProductSlider } from '@/components/sections/ProductSlider'
import { PromoTicker } from '@/components/sections/PromoTicker'
import { createServiceClient } from '@/lib/supabase/server'
import { resolverCanalTienda, getProductosDelCanal } from '@/lib/tienda'
import { aplicarTipoCambio } from '@/lib/utils'
import { PendingApproval } from '@/components/sections/PendingApproval'

export default async function Home() {
  const supabase = createServiceClient()

  const [canalInfo, { data: categoriasRows }, { data: bannerData }, { data: postsInstagram }] = await Promise.all([
    resolverCanalTienda(),
    supabase.from('categorias_home').select('nombre, href').eq('activo', true).not('href', 'is', null).order('orden'),
    supabase.from('banners').select('url, titulo, link_url').eq('activo', true).order('id', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('comunidad_fotos').select('id, thumbnail_url, caption, username, permalink, url_instagram').eq('activo', true).order('orden'),
  ])

  const { user, canalId, listaPrecio, mostrarPrecios, pendienteAprobacion, tipoCambioUsd } = canalInfo
  const { ids: idsCanal } = await getProductosDelCanal(canalId)

  const { data: fotosDestacadas } = await supabase
    .from('producto_fotos')
    .select('id, url, producto_id, orden, productos(titulo, codigo_interno, moneda, precio_lista3, precio_lista5)')
    .eq('destacada', true)
    .in('producto_id', idsCanal.length > 0 ? idsCanal : [-1])
    .order('orden')

  const headerCategorias = (categoriasRows ?? []).map(c => ({ label: c.nombre as string, href: c.href as string }))
  const banner = bannerData ? {
    url: bannerData.url,
    titulo: bannerData.titulo,
    linkUrl: bannerData.link_url,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  } : null

  const fotos = (fotosDestacadas ?? []).map((f) => {
    const producto = Array.isArray(f.productos) ? f.productos[0] : null
    const precioRaw = mostrarPrecios && listaPrecio && producto
      ? (producto[listaPrecio as keyof typeof producto] as number | null) ?? null
      : null
    const { precio, moneda } = aplicarTipoCambio(precioRaw, producto?.moneda ?? null, tipoCambioUsd)
    return {
      id: f.id,
      url: f.url,
      producto_id: f.producto_id,
      titulo: producto?.titulo ?? '',
      codigo_interno: producto?.codigo_interno ?? '',
      precio,
      moneda,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    }
  })

  const headerUser = user ? { nombre: user.nombre, rol: user.rol } : null

  return (
    <>
      <Header user={headerUser} categorias={headerCategorias} />
      <main className="flex-1">
        {pendienteAprobacion ? (
          <PendingApproval nombre={user?.nombre} />
        ) : (
          <>
            <Hero />
            <PromoTicker />
            <CategoryGallery />
            <ProductSlider fotos={fotos} />
            <InstagramSlider posts={postsInstagram ?? []} />
            <PromotionalBanner banner={banner} />
          </>
        )}
      </main>
      <Footer />
    </>
  )
}
