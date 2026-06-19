'use client'

import { Check, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { useCartStore } from '@/stores/cartStore'
import { supabaseImg } from '@/lib/images'
import { ColorPicker, type Variante } from './ColorPicker'

interface Props {
  producto: {
    id: number
    codigo_interno: string
    titulo: string
    precio: number | null
    iva?: number | null
    multiplo: number
    foto_url: string | null
    supabaseUrl: string
    variantes?: Variante[] | null
  }
  esMayorista?: boolean
}

export function AddToCartButton({ producto, esMayorista = false }: Props) {
  const { add, items, updateCantidad, setCartOpen } = useCartStore()
  const multiplo = producto.multiplo ?? 1
  const [cantidad, setCantidad] = useState(multiplo)
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<string | null>(null)

  const tieneVariantes = (producto.variantes?.length ?? 0) > 0

  function handleSelectVariante(nombre: string) {
    setVarianteSeleccionada(nombre)
    setCantidad(multiplo)
  }

  const varianteActual = producto.variantes?.find(v => v.nombre === varianteSeleccionada) ?? null
  const stockVariante = varianteActual?.stock ?? Infinity

  const itemKey = `${producto.id}:${varianteSeleccionada ?? ''}`
  const itemEnCarrito = items.find(i => (i.itemKey ?? `${i.productoId}:`) === itemKey)
  const cantidadMostrada = itemEnCarrito?.cantidad ?? cantidad

  function handleMenos() {
    if (itemEnCarrito) {
      const nueva = itemEnCarrito.cantidad - multiplo
      updateCantidad(itemKey, Math.max(multiplo, nueva))
    } else {
      setCantidad(prev => Math.max(multiplo, prev - multiplo))
    }
  }

  function handleMas() {
    const maxCantidad = stockVariante > 0 ? stockVariante : Infinity
    if (itemEnCarrito) {
      const nueva = itemEnCarrito.cantidad + multiplo
      updateCantidad(itemKey, Math.min(nueva, maxCantidad))
    } else {
      setCantidad(prev => Math.min(prev + multiplo, maxCantidad))
    }
  }

  function handleAgregar() {
    const precioBase = producto.precio ?? 0
    const precioCarrito = esMayorista
      ? precioBase
      : Math.round(precioBase * (1 + ((producto.iva ?? 21) / 100)))
    add({
      productoId: producto.id,
      itemKey,
      codigo_interno: producto.codigo_interno,
      titulo: producto.titulo,
      precio: precioCarrito,
      multiplo,
      foto_url: producto.foto_url ? supabaseImg(producto.supabaseUrl, producto.foto_url, 200) : null,
      variante: varianteSeleccionada ?? undefined,
    })
    if (cantidad !== multiplo) {
      updateCantidad(itemKey, cantidad)
    }
    setCartOpen(true)
  }

  const stepperBorder = { borderColor: 'var(--color-acero-claro)', background: 'var(--color-acero-brillo)' }
  const btnClass = 'w-10 h-10 flex items-center justify-center transition-colors hover:bg-[var(--color-acero-claro)]'

  const agregarDeshabilitado = tieneVariantes && !varianteSeleccionada

  return (
    <div className="mt-6 flex flex-col gap-4">

      {/* Selector de color */}
      {tieneVariantes && (
        <ColorPicker
          variantes={producto.variantes!}
          selected={varianteSeleccionada}
          onSelect={handleSelectVariante}
        />
      )}

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
          disabled={agregarDeshabilitado}
          className="w-full px-6 py-4 text-xs tracking-widest uppercase transition-colors duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--color-granito-oscuro)', color: 'white' }}
        >
          {agregarDeshabilitado ? 'Elegí un color' : '+ Agregar al carrito'}
        </button>
      )}
    </div>
  )
}
