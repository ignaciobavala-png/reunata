import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { CATEGORIAS, CATEGORIA_SLUGS } from '@/lib/categorias'
import { ProductGridPublic } from '@/components/sections/ProductGridPublic'

export function generateStaticParams() {
  return CATEGORIA_SLUGS.map(slug => ({ slug }))
}

export default async function CategoriaProductosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const nombreCategoria = CATEGORIAS[slug]
  if (!nombreCategoria) notFound()

  const supabase = createServiceClient()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  // Buscar productos públicos de esta categoría
  const { data: canal } = await supabase
    .from('canales')
    .select('id')
    .eq('slug', 'publico')
    .single()

  const canalPublicoId = canal?.id

  if (!canalPublicoId) {
    return <PlaceholderRegistro nombre={nombreCategoria} />
  }

  // Obtener IDs de productos en el canal público
  const { data: asignaciones } = await supabase
    .from('producto_canales')
    .select('producto_id')
    .eq('canal_id', canalPublicoId)

  const idsPublicos = (asignaciones ?? []).map(a => a.producto_id)

  if (idsPublicos.length === 0) {
    return <PlaceholderRegistro nombre={nombreCategoria} />
  }

  // Productos activos de esta categoría en el canal público
  const { data: productos } = await supabase
    .from('productos')
    .select('id, titulo, codigo_interno, producto_fotos(url, orden)')
    .eq('activo', true)
    .eq('categoria', slug)
    .in('id', idsPublicos)
    .order('titulo')

  if (!productos?.length) {
    return <PlaceholderRegistro nombre={nombreCategoria} />
  }

  const productosPublicos = productos.map(p => {
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
          {nombreCategoria}
        </h1>
        <p className="text-sm mb-12" style={{ color: 'var(--color-acero-oscuro)' }}>
          {productosPublicos.length} producto{productosPublicos.length !== 1 ? 's' : ''}
        </p>

        <ProductGridPublic productos={productosPublicos} nombreCategoria={nombreCategoria} />
      </div>
    </main>
  )
}

function PlaceholderRegistro({ nombre }: { nombre: string }) {
  return (
    <main className="bg-[var(--color-granito-oscuro)] pb-24">
      <div className="px-6 md:px-16 max-w-3xl mx-auto">
        <section className="pt-36 pb-20">
          <p className="text-xs tracking-widest uppercase mb-5 text-[var(--color-acero-oscuro)]">
            Catálogo
          </p>
          <h1
            className="text-4xl md:text-5xl leading-tight mb-8 text-[var(--color-acero-brillo)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {nombre}
          </h1>
        </section>

        <section className="py-16 border-t border-[var(--color-granito)]">
          <div className="rounded-2xl p-8 md:p-12 text-center"
            style={{ background: 'var(--color-granito)', border: '1px solid var(--color-granito-claro)' }}>
            <p className="text-xl mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-acero-brillo)' }}>
              Contenido exclusivo para clientes mayoristas
            </p>
            <p className="text-sm mb-8" style={{ color: 'var(--color-acero)' }}>
              Registrate o ingresá para ver precios, stock y hacer pedidos de {nombre.toLowerCase()}.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/login"
                className="px-8 py-3 text-sm rounded-full font-medium transition-colors duration-200"
                style={{ background: 'var(--color-acero-brillo)', color: 'var(--color-granito-oscuro)' }}
              >
                Ingresar
              </Link>
              <Link
                href="/trabaja-con-nosotros"
                className="px-8 py-3 text-sm rounded-full font-medium transition-colors duration-200"
                style={{ background: 'transparent', color: 'var(--color-acero-brillo)', border: '1px solid var(--color-granito-claro)' }}
              >
                Quiero ser cliente
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
