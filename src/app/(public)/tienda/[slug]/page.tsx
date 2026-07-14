export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { resolverCanalTienda, getProductosDelCanal } from '@/lib/tienda'
import { TodosClient } from '@/app/(public)/tienda/todos/TodosClient'
import { PendingApproval } from '@/components/sections/PendingApproval'
import { aplicarTipoCambio } from '@/lib/utils'
import { stockDisponible } from '@/lib/stock'

const SLUGS_ESPECIALES: Record<string, { nombre: string; subtitulo: string }> = {
  novedades:      { nombre: 'Novedades',    subtitulo: 'Los últimos productos incorporados al catálogo.' },
  'mas-vendidos': { nombre: 'Más elegidos', subtitulo: 'Los productos más elegidos por nuestros clientes.' },
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params

  if (SLUGS_ESPECIALES[slug]) {
    const { nombre, subtitulo } = SLUGS_ESPECIALES[slug]
    return {
      title: nombre,
      description: subtitulo,
      alternates: { canonical: `/tienda/${slug}` },
    }
  }

  const supabase = createServiceClient()
  const { data: cat } = await supabase
    .from('categorias_home')
    .select('nombre')
    .contains('categoria_keys', [slug])
    .single()

  const nombre = cat?.nombre ?? slug
  return {
    title: nombre,
    description: `Explorá la categoría ${nombre} en Reunata. Mates, termos y accesorios importados con envío a todo el país.`,
    alternates: { canonical: `/tienda/${slug}` },
  }
}

export default async function CategoriaProductosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createServiceClient()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const { user, canalId, listaPrecio, mostrarPrecios, pendienteAprobacion, tipoCambioUsd } = await resolverCanalTienda()
  const esMayorista = ['distribuidor', 'local', 'mercha', 'fabricantes'].includes(user?.rol ?? '')

  if (pendienteAprobacion) return <PendingApproval nombre={user?.nombre} />
  const { ids: idsCanal, multiplos } = await getProductosDelCanal(canalId)
  const filterCanal = idsCanal.length > 0 ? idsCanal : [-1]

  const precioSelect = 'precio_lista1, precio_lista2, precio_lista3, precio_lista4, precio_lista5, moneda, iva, stock, stock_visible, categoria, created_at, atributos'

  function extraerPrecio(p: Record<string, unknown>): number | null {
    if (!mostrarPrecios || !listaPrecio) return null
    return (p[listaPrecio] as number | null) ?? null
  }

  function mapProducto(p: {
    id: number
    titulo: string
    codigo_interno: string
    moneda?: string | null
    iva?: number | null
    [key: string]: unknown
    producto_fotos: { url: string; orden: number; destacada?: boolean }[] | null
  }) {
    const fotos = (p.producto_fotos ?? []).sort((a, b) => a.orden - b.orden)
    const { precio, moneda } = aplicarTipoCambio(extraerPrecio(p as Record<string, unknown>), p.moneda ?? null, tipoCambioUsd)
    return {
      id: p.id,
      titulo: p.titulo,
      codigo_interno: p.codigo_interno,
      foto_url: fotos[0]?.url ?? null,
      precio,
      moneda,
      iva: p.iva ?? 21,
      multiplo: multiplos[p.id] ?? 1,
      categoria: (p.categoria as string | null) ?? '',
      atributos: (p.atributos as { clave: string; valor: string }[] | null) ?? null,
      created_at: (p.created_at as string | null) ?? '',
      supabaseUrl,
      variantes: (p.variantes as { nombre: string; stock: number }[] | null) ?? null,
      stock: stockDisponible({
        stock: (p.stock as number | null) ?? null,
        stock_visible: (p.stock_visible as number | null) ?? null,
      }),
    }
  }

  // ── Slugs especiales ──────────────────────────────────────────────
  if (slug in SLUGS_ESPECIALES) {
    const meta = SLUGS_ESPECIALES[slug]

    let query = supabase
      .from('productos')
      .select(`id, titulo, codigo_interno, variantes, ${precioSelect}, producto_fotos(url, orden, destacada)`)
      .eq('activo', true)
      .in('id', filterCanal)

    if (slug === 'novedades') {
      const { data: marcados } = await supabase
        .from('productos')
        .select('id')
        .eq('es_novedad', true)
        .eq('activo', true)
        .in('id', filterCanal)
      if (marcados && marcados.length > 0) {
        query = query.in('id', marcados.map(p => p.id)).order('titulo')
      } else {
        query = query.order('created_at', { ascending: false }).limit(48)
      }
    } else {
      // Buscar IDs de productos que tienen al menos una foto destacada,
      // pero traer TODAS sus fotos para que mapProducto elija la primera por orden.
      const { data: conDestacada } = await supabase
        .from('producto_fotos')
        .select('producto_id')
        .eq('destacada', true)
        .in('producto_id', filterCanal)
      const idsDestacados = [...new Set((conDestacada ?? []).map(f => f.producto_id as number))]
      if (idsDestacados.length > 0) {
        query = query.in('id', idsDestacados).order('titulo')
      } else {
        // Sin productos marcados como "Más elegidos" → no mostrar nada (igual que el slider de homepage)
        query = query.in('id', [-1])
      }
    }

    const { data: productos } = await query
    const productosGrid = (productos ?? []).map(mapProducto).filter(p => p.foto_url !== null)

    return (
      <main style={{ background: 'var(--background)' }}>
        <div className="px-6 md:px-16 max-w-5xl mx-auto py-20 md:py-28">
          <nav className="text-xs tracking-widest uppercase mb-6 flex items-center gap-2" style={{ color: 'var(--color-acero-oscuro)' }}>
            <Link href="/tienda" className="hover:underline">Tienda</Link>
            <span>/</span>
            <span style={{ color: 'var(--foreground)' }}>{meta.nombre}</span>
          </nav>
          <h1 className="text-3xl md:text-5xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
            {meta.nombre}
          </h1>
          <p className="text-sm mb-12" style={{ color: 'var(--color-acero-oscuro)' }}>
            {productosGrid.length > 0 ? meta.subtitulo : 'No hay productos disponibles por el momento.'}
          </p>
          {productosGrid.length > 0 && (
            <TodosClient productos={productosGrid} nombreCategoria={meta.nombre} mostrarPrecios={mostrarPrecios} estaLogueado={!!user} esMayorista={esMayorista} />
          )}
        </div>
      </main>
    )
  }

  // ── Categoría normal ──────────────────────────────────────────────
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
    .select(`id, titulo, codigo_interno, variantes, ${precioSelect}, producto_fotos(url, orden)`)
    .eq('activo', true)
    .in('id', filterCanal)
    .in('categoria', categoriaKeys)
    .order('titulo')

  const productosGrid = (productos ?? []).map(mapProducto)

  if (productosGrid.length === 0) {
    return (
      <main style={{ background: 'var(--background)' }}>
        <div className="px-6 md:px-16 max-w-5xl mx-auto py-20 md:py-28">
          <nav className="text-xs tracking-widest uppercase mb-6 flex items-center gap-2" style={{ color: 'var(--color-acero-oscuro)' }}>
            <Link href="/tienda" className="hover:underline">Tienda</Link>
            <span>/</span>
            <span style={{ color: 'var(--foreground)' }}>{categoriaHome.nombre}</span>
          </nav>
          <h1 className="text-3xl md:text-5xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
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
        <nav className="text-xs tracking-widest uppercase mb-6 flex items-center gap-2" style={{ color: 'var(--color-acero-oscuro)' }}>
          <Link href="/tienda" className="hover:underline">Tienda</Link>
          <span>/</span>
          <span style={{ color: 'var(--foreground)' }}>{categoriaHome.nombre}</span>
        </nav>
        <h1 className="text-3xl md:text-5xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
          {categoriaHome.nombre}
        </h1>
        <div className="mb-6" />
        <TodosClient productos={productosGrid} nombreCategoria={categoriaHome.nombre} mostrarPrecios={mostrarPrecios} estaLogueado={!!user} esMayorista={esMayorista} />
      </div>
    </main>
  )
}
