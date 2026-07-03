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
  const esMayorista = ['distribuidor', 'local', 'mercha', 'fabricantes'].includes(user?.rol ?? '')
  if (pendienteAprobacion) return <PendingApproval nombre={user?.nombre} />

  const { ids: idsCanal, multiplos } = await getProductosDelCanal(canalId)

  const { data: producto } = await supabase
    .from('productos')
    .select('id, titulo, codigo_interno, categoria, descripcion, moneda, iva, stock, stock_visible, mostrar_stock, precio_lista1, precio_lista2, precio_lista3, precio_lista4, precio_lista5, variantes, producto_fotos(url, orden)')
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

            {precio != null && (() => {
              const precioConIva = Math.round(precio * (1 + ((producto.iva as number | null) ?? 21) / 100))
              return (
                <div className="mb-2">
                  <p
                    className={esMayorista ? 'text-2xl font-medium' : 'text-3xl font-bold'}
                    style={{ color: 'var(--foreground)' }}
                  >
                    {formatPrecio(esMayorista ? precio : precioConIva, monedaFinal)}
                  </p>
                  {esMayorista ? (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-acero-oscuro)' }}>
                      IVA incluido: {formatPrecio(precioConIva, monedaFinal)}
                    </p>
                  ) : (
                    <p className="text-sm mt-1" style={{ color: 'var(--color-acero-oscuro)' }}>
                      Precio sin impuestos nacionales: {formatPrecio(precio, monedaFinal)}
                    </p>
                  )}
                </div>
              )
            })()}

            {producto.mostrar_stock && (() => {
              const cantidad = producto.stock_visible ?? producto.stock
              if (cantidad === null || cantidad > 0) {
                if (cantidad !== null && cantidad > 0 && cantidad <= 5) {
                  return (
                    <p className="text-xs mb-3 font-medium" style={{ color: '#f59e0b' }}>
                      Últimas {cantidad} unidades
                    </p>
                  )
                }
                return null
              }
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

            {mostrarPrecios ? (
              <>
                <AddToCartButton
                  esMayorista={esMayorista}
                  aplicaIva={listaPrecio === 'precio_lista5'}
                  producto={{
                    id: producto.id,
                    codigo_interno: producto.codigo_interno,
                    titulo: producto.titulo,
                    precio,
                    iva: (producto.iva as number | null) ?? 21,
                    multiplo,
                    foto_url: fotos[0]?.url ?? null,
                    supabaseUrl,
                    variantes: (producto.variantes as { nombre: string; stock: number }[] | null) ?? null,
                    stock: producto.stock ?? null,
                  }}
                />
                <PaymentInfo esMayorista={esMayorista} />
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

            {producto.descripcion && (
              <p className="text-sm leading-relaxed mt-6 pt-6" style={{ color: 'var(--color-acero-oscuro)', borderTop: '1px solid var(--color-acero-claro)' }}>
                {producto.descripcion}
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
