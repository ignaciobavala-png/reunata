'use client'

import { Check, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { useCartStore } from '@/stores/cartStore'
import { supabaseImg } from '@/lib/images'

interface Props {
  producto: {
    id: number
    codigo_interno: string
    titulo: string
    precio: number | null
    multiplo: number
    foto_url: string | null
    supabaseUrl: string
  }
}

export function AddToCartButton({ producto }: Props) {
  const { add, items, updateCantidad, remove, setCartOpen } = useCartStore()
  const multiplo = producto.multiplo ?? 1
  const [cantidad, setCantidad] = useState(multiplo)

  const itemEnCarrito = items.find(i => i.productoId === producto.id)
  const cantidadMostrada = itemEnCarrito?.cantidad ?? cantidad

  function handleMenos() {
    if (itemEnCarrito) {
      const nueva = itemEnCarrito.cantidad - multiplo
      updateCantidad(producto.id, Math.max(multiplo, nueva))
    } else {
      setCantidad(prev => Math.max(multiplo, prev - multiplo))
    }
  }

  function handleMas() {
    if (itemEnCarrito) {
      updateCantidad(producto.id, itemEnCarrito.cantidad + multiplo)
    } else {
      setCantidad(prev => prev + multiplo)
    }
  }

  function handleAgregar() {
    add({
      productoId: producto.id,
      codigo_interno: producto.codigo_interno,
      titulo: producto.titulo,
      precio: producto.precio ?? 0,
      multiplo,
      foto_url: producto.foto_url ? supabaseImg(producto.supabaseUrl, producto.foto_url, 200) : null,
    })
    if (cantidad !== multiplo) {
      updateCantidad(producto.id, cantidad)
    }
    setCartOpen(true)
  }

  const stepperBorder = { borderColor: 'var(--color-acero-claro)', background: 'var(--color-acero-brillo)' }
  const btnClass = 'w-10 h-10 flex items-center justify-center transition-colors hover:bg-[var(--color-acero-claro)]'

  return (
    <div className="mt-6 flex flex-col gap-4">

      {/* Stepper */}
      <div className="flex items-center gap-4">
        <div className="flex items-center rounded-lg overflow-hidden border" style={stepperBorder}>
          <button
            onClick={handleMenos}
            className={btnClass}
            style={{ color: 'var(--color-granito)' }}
            aria-label="Reducir cantidad"
          >
            <Minus size={13} strokeWidth={2.5} />
          </button>
          <span
            className="w-12 text-center text-base font-semibold tabular-nums select-none"
            style={{ color: 'var(--foreground)' }}
          >
            {cantidadMostrada}
          </span>
          <button
            onClick={handleMas}
            className={btnClass}
            style={{ color: 'var(--color-granito)' }}
            aria-label="Aumentar cantidad"
          >
            <Plus size={13} strokeWidth={2.5} />
          </button>
        </div>
        {multiplo > 1 && (
          <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
            múltiplo de {multiplo}
          </span>
        )}
      </div>

      {/* CTA */}
      {itemEnCarrito ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm" style={{ color: '#10b981' }}>
            <Check size={15} strokeWidth={2.5} />
            <span>En tu carrito</span>
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="w-full px-6 py-4 text-xs tracking-widest uppercase text-center transition-colors"
            style={{ background: 'var(--color-granito-oscuro)', color: 'white' }}
          >
            Ver carrito
          </button>
        </div>
      ) : (
        <button
          onClick={handleAgregar}
          className="w-full px-6 py-4 text-xs tracking-widest uppercase transition-colors duration-300"
          style={{ background: 'var(--color-granito-oscuro)', color: 'white' }}
        >
          + Agregar al carrito
        </button>
      )}
    </div>
  )
}
