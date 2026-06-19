'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ImageIcon, Check, Heart } from 'lucide-react'
import { supabaseImg } from '@/lib/images'
import { useCartStore } from '@/stores/cartStore'
import { formatPrecio } from '@/lib/utils'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toggleFavorito } from '@/app/actions/favoritos'

interface ProductoPublico {
  id: number
  titulo: string
  codigo_interno: string
  foto_url: string | null
  precio: number | null
  moneda?: string | null
  iva?: number | null
  multiplo?: number
  supabaseUrl: string
  variantes?: { nombre: string; stock: number }[] | null
}

export function ProductGridPublic({
  productos,
  nombreCategoria,
  mostrarPrecios = false,
  estaLogueado = false,
  esMayorista = false,
}: {
  productos: ProductoPublico[]
  nombreCategoria: string
  mostrarPrecios?: boolean
  estaLogueado?: boolean
  esMayorista?: boolean
}) {
  const { add, items, setCartOpen } = useCartStore()
  const [agregados, setAgregados] = useState<Set<number>>(new Set())
  const [favoritos, setFavoritos] = useState<Set<number>>(new Set())
  const [loginHint, setLoginHint] = useState<number | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const router = useRouter()

  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  useEffect(() => {
    if (!estaLogueado) return
    getSupabase()
      .from('favoritos')
      .select('producto_id')
      .then(({ data }) => {
        if (data) setFavoritos(new Set(data.map(f => f.producto_id as number)))
      })
  }, [estaLogueado])

  async function handleToggleFavorito(e: React.MouseEvent, productoId: number) {
    e.preventDefault()
    e.stopPropagation()
    if (!estaLogueado) {
      setLoginHint(productoId)
      setTimeout(() => setLoginHint(null), 2500)
      return
    }
    // Optimistic update
    setFavoritos(prev => {
      const next = new Set(prev)
      if (next.has(productoId)) next.delete(productoId)
      else next.add(productoId)
      return next
    })
    const res = await toggleFavorito(productoId)
    if (!res.ok) {
      // Revert on error
      setFavoritos(prev => {
        const next = new Set(prev)
        if (next.has(productoId)) next.delete(productoId)
        else next.add(productoId)
        return next
      })
    }
  }

  if (productos.length === 0) return null

  function handleAgregar(p: ProductoPublico) {
    const tieneVariantes = (p.variantes?.length ?? 0) > 0
    if (tieneVariantes) {
      router.push(`/tienda/p/${p.id}`)
      return
    }
    const precioBase = p.precio ?? 0
    const precioCarrito = esMayorista
      ? precioBase
      : Math.round(precioBase * (1 + ((p.iva ?? 21) / 100)))
    add({
      productoId: p.id,
      itemKey: `${p.id}:`,
      codigo_interno: p.codigo_interno,
      titulo: p.titulo,
      precio: precioCarrito,
      multiplo: p.multiplo ?? 1,
      foto_url: p.foto_url ? supabaseImg(p.supabaseUrl, p.foto_url, 200) : null,
    })
    setAgregados(prev => new Set(prev).add(p.id))
    setTimeout(() => {
      setAgregados(prev => { const s = new Set(prev); s.delete(p.id); return s })
      setCartOpen(true)
    }, 1200)
  }

  const enCarrito = (id: number) => items.some(i => i.productoId === id)

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {productos.map((p) => {
          const agregado = agregados.has(p.id)
          const yaEsta = enCarrito(p.id)
          return (
            <div key={p.id} className="group">
              {/* Contenedor foto — Link al detalle + botón agregar superpuesto */}
              <div
                className="w-full aspect-[3/4] mb-3 relative overflow-hidden"
                style={{
                  border: yaEsta ? '2px solid #10b981' : '1px solid var(--border)',
                  transition: 'border-color 0.3s',
                }}
              >
                <Link href={`/tienda/p/${p.id}`} className="block absolute inset-0">
                  {p.foto_url ? (
                    <Image
                      src={supabaseImg(p.supabaseUrl, p.foto_url, 400, { height: 533 })}
                      alt={p.titulo}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--color-acero-claro)' }}>
                      <ImageIcon size={24} style={{ color: 'var(--color-acero-oscuro)' }} />
                    </div>
                  )}

                  {/* Overlay de feedback "Agregado ✓" */}
                  {agregado && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <span className="w-10 h-10 rounded-full bg-[#10b981] flex items-center justify-center">
                        <Check size={20} className="text-white" strokeWidth={2.5} />
                      </span>
                    </div>
                  )}

                  {/* Badge "en carrito" esquina superior derecha */}
                  {yaEsta && !agregado && (
                    <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#10b981] flex items-center justify-center">
                      <Check size={11} className="text-white" strokeWidth={3} />
                    </span>
                  )}
                </Link>

                {/* Corazón favorito — esquina superior izquierda */}
                <button
                  onClick={(e) => handleToggleFavorito(e, p.id)}
                  className="absolute top-2 left-2 z-10 w-7 h-7 flex items-center justify-center rounded-full transition-all duration-200"
                  style={{
                    background: favoritos.has(p.id) ? '#ef4444' : 'rgba(255,255,255,0.85)',
                    backdropFilter: 'blur(4px)',
                  }}
                  aria-label={favoritos.has(p.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                >
                  <Heart
                    size={14}
                    strokeWidth={2}
                    style={{ color: favoritos.has(p.id) ? 'white' : 'var(--color-granito-oscuro)' }}
                    fill={favoritos.has(p.id) ? 'white' : 'none'}
                  />
                </button>

                {/* Barra hover slide-up — separada del Link para evitar anidado inválido */}
                {!agregado && (
                  <button
                    onClick={() => yaEsta ? router.push('/carrito') : handleAgregar(p)}
                    className="absolute inset-x-0 bottom-0 z-10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out py-3 text-center text-xs tracking-[0.15em] uppercase"
                    style={{ background: yaEsta ? '#10b981' : 'var(--color-granito-oscuro)', color: 'white' }}
                    aria-label={yaEsta ? 'Ver carrito' : (p.variantes?.length ?? 0) > 0 ? `Elegir color de ${p.titulo}` : `Agregar ${p.titulo}`}
                  >
                    {yaEsta ? '✓ Ver carrito' : (p.variantes?.length ?? 0) > 0 ? 'Elegir color →' : '+ Agregar'}
                  </button>
                )}
              </div>

              <Link href={`/tienda/p/${p.id}`} className="block">
                <p className="text-sm font-medium leading-snug" style={{ color: 'var(--foreground)' }}>
                  {p.titulo}
                </p>
                <p className="text-xs font-mono" style={{ color: 'var(--color-acero-oscuro)' }}>
                  {p.codigo_interno}
                </p>
                {p.precio != null && (() => {
                  const precioConIva = Math.round(p.precio * (1 + (p.iva ?? 21) / 100))
                  return esMayorista ? (
                    <>
                      <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--foreground)' }}>
                        {formatPrecio(p.precio, p.moneda)}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--color-acero-oscuro)' }}>
                        Precio s/ IVA
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--color-acero-oscuro)' }}>
                        + IVA: {formatPrecio(precioConIva, p.moneda)}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--foreground)' }}>
                        {formatPrecio(precioConIva, p.moneda)}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--color-acero-oscuro)' }}>
                        IVA incluido
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--color-acero-oscuro)' }}>
                        s/ IVA: {formatPrecio(p.precio, p.moneda)}
                      </p>
                    </>
                  )
                })()}
              </Link>
              {loginHint === p.id && (
                <p className="text-xs mt-1" style={{ color: '#ef4444' }}>
                  <Link href="/login" className="underline">Iniciá sesión</Link> para guardar favoritos
                </p>
              )}
              {(p.multiplo ?? 1) > 1 && (
                <span
                  className="inline-block mt-1 px-1.5 py-0.5 text-xs font-medium tracking-wide rounded"
                  style={{ background: 'var(--color-acero-claro)', color: 'var(--color-granito-oscuro)' }}
                >
                  × {p.multiplo} u. mín.
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* CTA — solo para usuarios sin precios asignados */}
      {!mostrarPrecios && (
        <div
          className="mt-16 py-10 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <div>
            <p className="text-lg font-medium mb-1" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
              ¿Querés ver precios y hacer pedidos?
            </p>
            <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
              {estaLogueado
                ? 'Contactanos para activar tu acceso a precios y pedidos mayoristas.'
                : `Registrate para ver precios, stock y hacer pedidos de ${nombreCategoria.toLowerCase()}.`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {estaLogueado ? (
              <a
                href="/contacto"
                className="px-6 py-3 text-xs tracking-widest uppercase transition-colors"
                style={{ background: 'var(--color-granito)', color: 'white' }}
              >
                Contactar
              </a>
            ) : (
              <>
                <a
                  href="/registro"
                  className="px-6 py-3 text-xs tracking-widest uppercase transition-colors"
                  style={{ background: 'var(--color-granito)', color: 'white' }}
                >
                  Quiero ser cliente
                </a>
                <a
                  href="/login"
                  className="text-xs tracking-widest uppercase hover:underline"
                  style={{ color: 'var(--color-granito-claro)' }}
                >
                  Ya tengo cuenta
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
