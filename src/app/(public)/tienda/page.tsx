export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { Hero } from '@/components/sections/Hero'

export const metadata: Metadata = {
  title: 'Tienda — Mates, termos y accesorios',
  description: 'Explorá el catálogo completo de Reunata: mates, termos, bombillas y accesorios importados. Envíos a todo el país.',
  alternates: { canonical: '/tienda' },
}
import { CategoryGallery } from '@/components/sections/CategoryGallery'
import { InstagramSlider } from '@/components/sections/InstagramSlider'
import { PromotionalBanner } from '@/components/sections/PromotionalBanner'
import { ProductSlider } from '@/components/sections/ProductSlider'
import { PromoTicker } from '@/components/sections/PromoTicker'
import { ProductGridPublic } from '@/components/sections/ProductGridPublic'
import { createServiceClient } from '@/lib/supabase/server'
import { resolverCanalTienda, getProductosDelCanal } from '@/lib/tienda'
import { PendingApproval } from '@/components/sections/PendingApproval'

export default async function TiendaPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const busqueda = q?.trim() ?? ''

  const supabase = createServiceClient()

  const [canalInfo, { data: bannerData }, { data: postsInstagram }] = await Promise.all([
    resolverCanalTienda(),
    supabase.from('banners').select('url, titulo, link_url').eq('activo', true).order('id', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('comunidad_fotos').select('id, thumbnail_url, caption, username, permalink, url_instagram').eq('activo', true).order('orden'),
  ])

  const { user, canalId, listaPrecio, mostrarPrecios, pendienteAprobacion } = canalInfo

  if (pendienteAprobacion) return <PendingApproval nombre={user?.nombre} />
  const { ids: idsCanal, multiplos } = await getProductosDelCanal(canalId)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  // ── Resultados de búsqueda ─────────────────────────────────────────
  if (busqueda) {
    const { data: resultados } = await supabase
      .from('productos')
      .select(`id, titulo, codigo_interno, precio_lista1, precio_lista2, precio_lista3, precio_lista5, producto_fotos(url, orden)`)
      .eq('activo', true)
      .in('id', idsCanal.length > 0 ? idsCanal : [-1])
      .or(`titulo.ilike.%${busqueda}%,codigo_interno.ilike.%${busqueda}%`)
      .order('titulo')
      .limit(60)

    const productosGrid = (resultados ?? []).map(p => {
      const fotos = ((p.producto_fotos ?? []) as { url: string; orden: number }[]).sort((a, b) => a.orden - b.orden)
      const precio = mostrarPrecios && listaPrecio
        ? ((p as Record<string, unknown>)[listaPrecio] as number | null) ?? null
        : null
      return { id: p.id, titulo: p.titulo, codigo_interno: p.codigo_interno, foto_url: fotos[0]?.url ?? null, precio, multiplo: multiplos[p.id] ?? 1, supabaseUrl }
    })

    return (
      <main style={{ background: 'var(--background)' }}>
        <div className="px-6 md:px-16 max-w-5xl mx-auto py-20 md:py-28">
          <p className="text-xs tracking-widest uppercase mb-4" style={{ color: 'var(--color-acero-oscuro)' }}>Búsqueda</p>
          <h1 className="text-3xl md:text-5xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
            "{busqueda}"
          </h1>
          <p className="text-sm mb-12" style={{ color: 'var(--color-acero-oscuro)' }}>
            {productosGrid.length > 0
              ? `${productosGrid.length} resultado${productosGrid.length !== 1 ? 's' : ''}`
              : 'Sin resultados para esta búsqueda.'}
          </p>
          {productosGrid.length > 0 && (
            <ProductGridPublic productos={productosGrid} nombreCategoria="búsqueda" mostrarPrecios={mostrarPrecios} estaLogueado={!!user} />
          )}
        </div>
      </main>
    )
  }

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
