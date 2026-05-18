import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { ProductGridPublic } from '@/components/sections/ProductGridPublic'

const SLUGS_ESPECIALES: Record<string, { nombre: string; subtitulo: string }> = {
  novedades:    { nombre: 'Novedades',    subtitulo: 'Los últimos productos incorporados al catálogo.' },
  'mas-vendidos': { nombre: 'Más vendidos', subtitulo: 'Los productos más elegidos por nuestros clientes.' },
}

export default async function CategoriaProductosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const supabase = createServiceClient()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  // Slugs especiales: no dependen de categorias_home
  if (slug in SLUGS_ESPECIALES) {
    const meta = SLUGS_ESPECIALES[slug]

    let query = supabase
      .from('productos')
      .select('id, titulo, codigo_interno, producto_fotos(url, orden, destacada)')
      .eq('activo', true)

    if (slug === 'novedades') {
      query = query.order('created_at', { ascending: false }).limit(48)
    } else {
      // mas-vendidos: productos con al menos una foto destacada
      query = query.eq('producto_fotos.destacada', true).order('titulo')
    }

    const { data: productos } = await query

    const productosPublicos = (productos ?? []).map(p => {
      const fotos = (p.producto_fotos as { url: string; orden: number }[] | null) ?? []
      const primeraFoto = fotos.sort((a, b) => a.orden - b.orden)[0] ?? null
      return { id: p.id, titulo: p.titulo, codigo_interno: p.codigo_interno, foto_url: primeraFoto?.url ?? null, supabaseUrl }
    }).filter(p => p.foto_url !== null)

    return (
      <main style={{ background: 'var(--background)' }}>
        <div className="px-6 md:px-16 max-w-5xl mx-auto py-20 md:py-28">
          <p className="text-xs tracking-widest uppercase mb-4" style={{ color: 'var(--color-acero-oscuro)' }}>Catálogo</p>
          <h1 className="text-3xl md:text-5xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
            {meta.nombre}
          </h1>
          <p className="text-sm mb-12" style={{ color: 'var(--color-acero-oscuro)' }}>
            {productosPublicos.length > 0 ? meta.subtitulo : 'No hay productos disponibles por el momento.'}
          </p>
          {productosPublicos.length > 0 && (
            <ProductGridPublic productos={productosPublicos} nombreCategoria={meta.nombre} />
          )}
        </div>
      </main>
    )
  }

  const { data: categoriaHome } = await supabase
    .from('categorias_home')
    .select('nombre, categoria_keys')
    .eq('href', `/tienda/${slug}`)
    .eq('activo', true)
    .single()

  if (!categoriaHome) notFound()

  const categoriaKeys = (categoriaHome.categoria_keys ?? []) as string[]

  const { data: productos } = await supabase
    .from('productos')
    .select('id, titulo, codigo_interno, producto_fotos(url, orden)')
    .eq('activo', true)
    .in('categoria', categoriaKeys)
    .order('titulo')

  const productosPublicos = (productos ?? []).map(p => {
    const fotos = (p.producto_fotos as { url: string; orden: number }[] | null) ?? []
    const primeraFoto = fotos.sort((a, b) => a.orden - b.orden)[0] ?? null
    return {
      id: p.id,
      titulo: p.titulo,
      codigo_interno: p.codigo_interno,
      foto_url: primeraFoto?.url ?? null,
      supabaseUrl,
    }
  })

  if (productosPublicos.length === 0) {
    return (
      <main style={{ background: 'var(--background)' }}>
        <div className="px-6 md:px-16 max-w-5xl mx-auto py-20 md:py-28">
          <p className="text-xs tracking-widest uppercase mb-4" style={{ color: 'var(--color-acero-oscuro)' }}>
            Catálogo
          </p>
          <h1
            className="text-3xl md:text-5xl mb-2"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}
          >
            {categoriaHome.nombre}
          </h1>
          <p className="text-sm mb-12" style={{ color: 'var(--color-acero-oscuro)' }}>
            No hay productos en esta categoría por el momento.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main style={{ background: 'var(--background)' }}>
      <div className="px-6 md:px-16 max-w-5xl mx-auto py-20 md:py-28">
        <p className="text-xs tracking-widest uppercase mb-4" style={{ color: 'var(--color-acero-oscuro)' }}>
          Catálogo
        </p>
        <h1
          className="text-3xl md:text-5xl mb-2"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}
        >
          {categoriaHome.nombre}
        </h1>
        <p className="text-sm mb-12" style={{ color: 'var(--color-acero-oscuro)' }}>
          {productosPublicos.length} producto{productosPublicos.length !== 1 ? 's' : ''}
        </p>

        <ProductGridPublic productos={productosPublicos} nombreCategoria={categoriaHome.nombre} />
      </div>
    </main>
  )
}
