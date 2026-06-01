'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'
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
  const { add, items } = useCartStore()
  const [agregado, setAgregado] = useState(false)
  const enCarrito = items.some(i => i.productoId === producto.id)

  function handleAgregar() {
    add({
      productoId: producto.id,
      codigo_interno: producto.codigo_interno,
      titulo: producto.titulo,
      precio: producto.precio ?? 0,
      multiplo: producto.multiplo,
      foto_url: producto.foto_url ? supabaseImg(producto.supabaseUrl, producto.foto_url, 200) : null,
    })
    setAgregado(true)
    setTimeout(() => setAgregado(false), 2000)
  }

  if (enCarrito) {
    return (
      <div className="mt-6 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm" style={{ color: '#10b981' }}>
          <Check size={16} strokeWidth={2.5} />
          <span>En tu carrito</span>
        </div>
        <Link
          href="/carrito"
          className="px-6 py-4 text-xs tracking-widest uppercase text-center transition-colors"
          style={{ background: 'var(--color-granito-oscuro)', color: 'white' }}
        >
          Ver carrito
        </Link>
      </div>
    )
  }

  return (
    <button
      onClick={handleAgregar}
      className="mt-6 w-full px-6 py-4 text-xs tracking-widest uppercase transition-colors duration-300"
      style={{
        background: agregado ? '#10b981' : 'var(--color-granito-oscuro)',
        color: 'white',
      }}
    >
      {agregado ? '✓ Agregado al carrito' : '+ Agregar al carrito'}
    </button>
  )
}
