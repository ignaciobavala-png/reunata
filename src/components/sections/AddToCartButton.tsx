'use client'

import { Check } from 'lucide-react'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
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
    stock?: number | null
  }
  esMayorista?: boolean
  // Fuente canónica para aritmética de IVA — derivada de listaPrecio en el server.
  // Cuando se pasa explícitamente, tiene precedencia sobre `!esMayorista`.
  aplicaIva?: boolean
}

export function AddToCartButton({ producto, esMayorista = false, aplicaIva }: Props) {
  const { add, items, updateCantidad, setCartOpen } = useCartStore()
  const multiplo = producto.multiplo ?? 1
  const [cantidad, setCantidad] = useState(0)
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<string | null>(null)

  const tieneVariantes = (producto.variantes?.length ?? 0) > 0

  function handleSelectVariante(nombre: string) {
    setVarianteSeleccionada(nombre)
    setCantidad(0)
  }

  const varianteActual = producto.variantes?.find(v => v.nombre === varianteSeleccionada) ?? null
  // Para productos con variantes: usar stock de la variante seleccionada (cada color es independiente).
  // Para productos sin variantes: usar producto.stock como límite si está disponible.
  const stockVariante = tieneVariantes
    ? (varianteActual?.stock ?? Infinity)
    : (producto.stock != null ? producto.stock : Infinity)

  const itemKey = `${producto.id}:${varianteSeleccionada ?? ''}`
  const itemEnCarrito = items.find(i => (i.itemKey ?? `${i.productoId}:`) === itemKey)
  const cantidadMostrada = itemEnCarrito?.cantidad ?? cantidad

  function handleAgregar() {
    const cantidadReal = cantidad === 0 ? multiplo : cantidad
    const precioBase = producto.precio ?? 0
    const debeAplicarIva = aplicaIva ?? !esMayorista
    const precioCarrito = debeAplicarIva
      ? Math.round(precioBase * (1 + ((producto.iva ?? 21) / 100)))
      : precioBase
    if (itemEnCarrito) {
      updateCantidad(itemKey, itemEnCarrito.cantidad + cantidadReal)
    } else {
      add({
        productoId: producto.id,
        itemKey,
        codigo_interno: producto.codigo_interno,
        titulo: producto.titulo,
        precio: precioCarrito,
        multiplo,
        foto_url: producto.foto_url ? supabaseImg(producto.supabaseUrl, producto.foto_url, 200) : null,
        variante: varianteSeleccionada ?? undefined,
        stock: tieneVariantes ? (varianteActual?.stock ?? null) : (producto.stock ?? null),
      })
      if (cantidadReal !== multiplo) {
        updateCantidad(itemKey, cantidadReal)
      }
    }
    setCartOpen(true)
  }

  // Sin stock: con variantes recién se sabe al elegir color; sin variantes, directo del producto
  const sinStock = tieneVariantes
    ? (varianteSeleccionada ? stockVariante <= 0 : (producto.variantes!.every(v => v.stock <= 0)))
    : stockVariante !== Infinity && stockVariante <= 0
  const agregarDeshabilitado = sinStock || (tieneVariantes && !varianteSeleccionada)

  function handleCommit(n: number) {
    const capped = stockVariante !== Infinity ? Math.min(n, stockVariante) : n
    if (itemEnCarrito) {
      updateCantidad(itemKey, capped)
    } else {
      setCantidad(capped)
    }
  }

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
        <QuantityStepper
          value={cantidadMostrada}
          multiplo={multiplo}
          max={stockVariante !== Infinity ? stockVariante : null}
          plusDisabled={stockVariante !== Infinity && cantidadMostrada + multiplo > stockVariante}
          onCommit={handleCommit}
        />
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
          {sinStock ? 'Sin stock' : agregarDeshabilitado ? 'Elegí un color' : '+ Agregar al carrito'}
        </button>
      )}
    </div>
  )
}
