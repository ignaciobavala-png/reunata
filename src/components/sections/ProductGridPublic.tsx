'use client'

import Image from 'next/image'
import { ImageIcon, Check } from 'lucide-react'
import { supabaseImg } from '@/lib/images'
import { useCartStore } from '@/stores/cartStore'
import { useState } from 'react'

interface ProductoPublico {
  id: number
  titulo: string
  codigo_interno: string
  foto_url: string | null
  precio: number | null
  supabaseUrl: string
}

export function ProductGridPublic({
  productos,
  nombreCategoria,
  mostrarPrecios = false,
  estaLogueado = false,
}: {
  productos: ProductoPublico[]
  nombreCategoria: string
  mostrarPrecios?: boolean
  estaLogueado?: boolean
}) {
  const { add, items, setCartOpen } = useCartStore()
  const [agregados, setAgregados] = useState<Set<number>>(new Set())

  if (productos.length === 0) return null

  function handleAgregar(p: ProductoPublico) {
    if (enCarrito(p.id)) {
      setCartOpen(true)
      return
    }
    add({
      productoId: p.id,
      codigo_interno: p.codigo_interno,
      titulo: p.titulo,
      precio: 0,
      foto_url: p.foto_url ? supabaseImg(p.supabaseUrl, p.foto_url, 200) : null,
    })
    setAgregados(prev => new Set(prev).add(p.id))
    setTimeout(() => {
      setCartOpen(true)
      setAgregados(prev => { const s = new Set(prev); s.delete(p.id); return s })
    }, 600)
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
              <button
                onClick={() => handleAgregar(p)}
                className="w-full aspect-[3/4] mb-3 relative overflow-hidden block"
                style={{
                  border: yaEsta ? '2px solid #10b981' : '1px solid var(--border)',
                  transition: 'border-color 0.3s',
                }}
                aria-label={yaEsta ? 'Ver carrito' : `Agregar ${p.titulo}`}
              >
                {/* Foto */}
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

                {/* Barra hover slide-up */}
                {!agregado && (
                  <div
                    className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out py-3 text-center text-[10px] tracking-[0.2em] uppercase"
                    style={{ background: yaEsta ? '#10b981' : 'var(--color-granito-oscuro)', color: 'white' }}
                  >
                    {yaEsta ? '✓ Ver carrito' : '+ Agregar'}
                  </div>
                )}

                {/* Badge "en carrito" esquina superior derecha */}
                {yaEsta && !agregado && (
                  <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#10b981] flex items-center justify-center">
                    <Check size={11} className="text-white" strokeWidth={3} />
                  </span>
                )}
              </button>

              <p className="text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>
                {p.titulo}
              </p>
              <p className="text-[10px] font-mono" style={{ color: 'var(--color-acero-oscuro)' }}>
                {p.codigo_interno}
              </p>
              {p.precio != null && (
                <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--foreground)' }}>
                  u$s {p.precio.toFixed(2)}
                </p>
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
