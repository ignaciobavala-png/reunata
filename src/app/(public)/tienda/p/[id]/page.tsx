export const dynamic = 'force-dynamic'

import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import { resolverCanalTienda, getProductosDelCanal } from '@/lib/tienda'
import { AddToCartButton } from '@/components/sections/AddToCartButton'
import { PendingApproval } from '@/components/sections/PendingApproval'
import { supabaseImg } from '@/lib/images'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('productos')
    .select('titulo, codigo_interno')
    .eq('id', parseInt(id))
    .single()
  if (!data) return {}
  return {
    title: `${data.titulo} — Reunata`,
    description: `${data.titulo} (${data.codigo_interno}) — Mates, termos y accesorios importados.`,
    alternates: { canonical: `/tienda/p/${id}` },
  }
}

export default async function ProductoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const productoId = parseInt(id)
  if (isNaN(productoId)) notFound()

  const supabase = createServiceClient()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const { user, canalId, listaPrecio, mostrarPrecios, pendienteAprobacion } = await resolverCanalTienda()
  if (pendienteAprobacion) return <PendingApproval nombre={user?.nombre} />

  const { ids: idsCanal, multiplos } = await getProductosDelCanal(canalId)

  const { data: producto } = await supabase
    .from('productos')
    .select('id, titulo, codigo_interno, categoria, precio_lista1, precio_lista2, precio_lista3, precio_lista5, producto_fotos(url, orden)')
    .eq('id', productoId)
    .eq('activo', true)
    .single()

  if (!producto) notFound()
  if (idsCanal.length > 0 && !idsCanal.includes(producto.id)) notFound()

  const fotos = ((producto.producto_fotos ?? []) as { url: string; orden: number }[])
    .sort((a, b) => a.orden - b.orden)

  const precio: number | null = mostrarPrecios && listaPrecio
    ? ((producto as Record<string, unknown>)[listaPrecio] as number | null) ?? null
    : null

  const multiplo = multiplos[producto.id] ?? 1

  // Categoría para el breadcrumb
  const { data: cat } = await supabase
    .from('categorias_home')
    .select('nombre, href')
    .contains('categoria_keys', [producto.categoria])
    .eq('activo', true)
    .maybeSingle()

  return (
    <main style={{ background: 'var(--background)' }}>
      <div className="px-6 md:px-16 max-w-5xl mx-auto py-20 md:py-28">

        {/* Breadcrumb */}
        <nav className="text-xs tracking-widest uppercase mb-10 flex flex-wrap items-center gap-2" style={{ color: 'var(--color-acero-oscuro)' }}>
          <Link href="/tienda" className="hover:underline">Tienda</Link>
          {cat && (
            <>
              <span>/</span>
              <Link href={cat.href} className="hover:underline">{cat.nombre}</Link>
            </>
          )}
          <span>/</span>
          <span style={{ color: 'var(--foreground)' }}>{producto.titulo}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-start">

          {/* Galería de fotos */}
          <div className="flex flex-col gap-3">
            {fotos.length > 0 ? fotos.map((f, i) => (
              <div
                key={i}
                className="aspect-[3/4] relative overflow-hidden"
                style={{ border: '1px solid var(--border)' }}
              >
                <Image
                  src={supabaseImg(supabaseUrl, f.url)}
                  alt={`${producto.titulo}${fotos.length > 1 ? ` — foto ${i + 1}` : ''}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority={i === 0}
                />
              </div>
            )) : (
              <div
                className="aspect-[3/4] flex items-center justify-center"
                style={{ background: 'var(--color-acero-claro)', border: '1px solid var(--border)' }}
              >
                <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Sin foto</span>
              </div>
            )}
          </div>

          {/* Info del producto */}
          <div className="md:sticky md:top-24">
            <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--color-acero-oscuro)' }}>
              {producto.codigo_interno}
            </p>
            <h1
              className="text-2xl md:text-4xl mb-6 leading-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}
            >
              {producto.titulo}
            </h1>

            {precio != null && (
              <p className="text-2xl font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                u$s {precio.toFixed(2)}
              </p>
            )}

            {multiplo > 1 && (
              <span
                className="inline-block mb-4 px-2 py-1 text-xs font-medium rounded"
                style={{ background: 'var(--color-acero-claro)', color: 'var(--color-granito-oscuro)' }}
              >
                × {multiplo} u. mín.
              </span>
            )}

            {mostrarPrecios ? (
              <AddToCartButton
                producto={{
                  id: producto.id,
                  codigo_interno: producto.codigo_interno,
                  titulo: producto.titulo,
                  precio,
                  multiplo,
                  foto_url: fotos[0]?.url ?? null,
                  supabaseUrl,
                }}
              />
            ) : (
              <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
                <p className="text-sm mb-6" style={{ color: 'var(--color-acero-oscuro)' }}>
                  {user
                    ? 'Contactanos para activar tu acceso a precios y pedidos mayoristas.'
                    : 'Registrate para ver los precios y hacer pedidos.'}
                </p>
                <div className="flex flex-wrap gap-3">
                  {user ? (
                    <Link
                      href="/contacto"
                      className="px-6 py-3 text-xs tracking-widest uppercase transition-colors"
                      style={{ background: 'var(--color-granito)', color: 'white' }}
                    >
                      Contactar
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/registro"
                        className="px-6 py-3 text-xs tracking-widest uppercase transition-colors"
                        style={{ background: 'var(--color-granito)', color: 'white' }}
                      >
                        Registrate
                      </Link>
                      <Link
                        href="/login"
                        className="text-xs tracking-widest uppercase hover:underline self-center"
                        style={{ color: 'var(--color-granito-claro)' }}
                      >
                        Ya tengo cuenta
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
