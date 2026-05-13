'use client'

import Image from 'next/image'
import { ImageIcon, ShoppingBag, Check } from 'lucide-react'
import { supabaseImg } from '@/lib/images'
import { useCartStore } from '@/stores/cartStore'
import { useState } from 'react'

interface ProductoPublico {
  id: number
  titulo: string
  codigo_interno: string
  foto_url: string | null
  supabaseUrl: string
}

export function ProductGridPublic({
  productos,
  nombreCategoria,
}: {
  productos: ProductoPublico[]
  nombreCategoria: string
}) {
  const { add, items } = useCartStore()
  const [agregados, setAgregados] = useState<Set<number>>(new Set())

  if (productos.length === 0) return null

  function handleAgregar(p: ProductoPublico) {
    add({ productoId: p.id, codigo_interno: p.codigo_interno, titulo: p.titulo, precio: 0 })
    setAgregados(prev => new Set(prev).add(p.id))
    setTimeout(() => setAgregados(prev => { const s = new Set(prev); s.delete(p.id); return s }), 1500)
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
              <div
                className="w-full aspect-[3/4] mb-3 relative overflow-hidden"
                style={{ border: '1px solid var(--border)' }}
              >
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

                {/* Botón agregar superpuesto */}
                <button
                  onClick={() => handleAgregar(p)}
                  className="absolute bottom-2 right-2 p-2 rounded-lg transition-all duration-150"
                  style={{
                    background: agregado || yaEsta ? '#10b981' : 'var(--color-granito-oscuro)',
                    color: 'white',
                    opacity: agregado || yaEsta ? 1 : undefined,
                  }}
                  title={yaEsta ? 'En el carrito' : 'Agregar al carrito'}
                >
                  {agregado || yaEsta ? <Check size={14} /> : <ShoppingBag size={14} />}
                </button>
              </div>
              <p className="text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>
                {p.titulo}
              </p>
              <p className="text-[10px] font-mono" style={{ color: 'var(--color-acero-oscuro)' }}>
                {p.codigo_interno}
              </p>
            </div>
          )
        })}
      </div>

      {/* CTA */}
      <div
        className="mt-16 py-10 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div>
          <p className="text-lg font-medium mb-1" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
            ¿Querés ver precios y hacer pedidos?
          </p>
          <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
            Registrate para ver precios, stock y hacer pedidos de {nombreCategoria.toLowerCase()}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/registro"
            className="px-6 py-3 text-xs tracking-widest uppercase transition-colors"
            style={{ background: 'var(--color-granito)', color: 'white' }}
          >
            Quiero ser cliente
          </a>
          <a
            href="/login?next=/dashboard/cliente/catalogo"
            className="text-xs tracking-widest uppercase hover:underline"
            style={{ color: 'var(--color-granito-claro)' }}
          >
            Ya tengo cuenta
          </a>
        </div>
      </div>
    </div>
  )
}
