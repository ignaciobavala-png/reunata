export const dynamic = 'force-dynamic'

import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import { resolverCanalTienda, getProductosDelCanal } from '@/lib/tienda'
import { AddToCartButton } from '@/components/sections/AddToCartButton'
import { PendingApproval } from '@/components/sections/PendingApproval'
import { ProductGallery } from '@/components/sections/ProductGallery'
import { formatPrecio, aplicarTipoCambio } from '@/lib/utils'

function PaymentInfo({ esMayorista }: { esMayorista: boolean }) {
  if (!esMayorista) return null
  return (
    <div className="mt-5 pt-4 flex flex-col gap-2" style={{ borderTop: '1px solid var(--color-acero-claro)' }}>
      <p className="text-xs font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>Medios de pago</p>
      <div className="flex flex-wrap gap-2">
        {['Transferencia bancaria', 'Cheque', 'Efectivo'].map(m => (
          <span
            key={m}
            className="px-2.5 py-1 text-xs rounded-full"
            style={{ background: 'var(--color-acero-claro)', color: 'var(--color-granito-oscuro)' }}
          >
            {m}
          </span>
        ))}
      </div>
    </div>
  )
}

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

  const { user, canalId, listaPrecio, mostrarPrecios, pendienteAprobacion, tipoCambioUsd } = await resolverCanalTienda()
  if (pendienteAprobacion) return <PendingApproval nombre={user?.nombre} />

  const { ids: idsCanal, multiplos } = await getProductosDelCanal(canalId)

  const { data: producto } = await supabase
    .from('productos')
    .select('id, titulo, codigo_interno, categoria, descripcion, moneda, stock, stock_visible, mostrar_stock, precio_lista3, precio_lista5, producto_fotos(url, orden)')
    .eq('id', productoId)
    .eq('activo', true)
    .single()

  if (!producto) notFound()
  if (idsCanal.length > 0 && !idsCanal.includes(producto.id)) notFound()

  const fotos = ((producto.producto_fotos ?? []) as { url: string; orden: number }[])
    .sort((a, b) => a.orden - b.orden)

  const precioRaw: number | null = mostrarPrecios && listaPrecio
    ? ((producto as Record<string, unknown>)[listaPrecio] as number | null) ?? null
    : null
  const { precio, moneda: monedaFinal } = aplicarTipoCambio(precioRaw, producto.moneda ?? null, tipoCambioUsd)

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
          <ProductGallery fotos={fotos} titulo={producto.titulo} supabaseUrl={supabaseUrl} />

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
                {formatPrecio(precio, monedaFinal)}
              </p>
            )}

            {producto.mostrar_stock && (() => {
              const cantidad = producto.stock_visible ?? producto.stock
              if (cantidad === null || cantidad > 0) return null
              return (
                <p className="text-xs mb-3" style={{ color: '#ef4444' }}>Sin stock</p>
              )
            })()}

            {multiplo > 1 && (
              <span
                className="inline-block mb-4 px-2 py-1 text-xs font-medium rounded"
                style={{ background: 'var(--color-acero-claro)', color: 'var(--color-granito-oscuro)' }}
              >
                × {multiplo} u. mín.
              </span>
            )}

            {producto.descripcion && (
              <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--color-acero-oscuro)' }}>
                {producto.descripcion}
              </p>
            )}

            {mostrarPrecios ? (
              <>
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
                <PaymentInfo esMayorista={['distribuidor', 'local', 'mercha'].includes(user?.rol ?? '')} />
              </>
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
