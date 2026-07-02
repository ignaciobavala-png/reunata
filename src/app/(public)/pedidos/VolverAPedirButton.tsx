'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RotateCcw } from 'lucide-react'
import { useCartStore } from '@/stores/cartStore'
import { getItemsParaRecomprar } from '@/app/actions/pedidos'

export function VolverAPedirButton({ pedidoId, compact = false }: { pedidoId: string; compact?: boolean }) {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleClick() {
    if (cargando) return
    setCargando(true)
    setError(null)

    const res = await getItemsParaRecomprar(pedidoId)
    if (!res.ok) {
      setError(res.error)
      setCargando(false)
      return
    }
    if (res.items.length === 0) {
      setError('Los productos de este pedido ya no están disponibles.')
      setCargando(false)
      return
    }

    // Se suma al carrito actual (no lo reemplaza); si el ítem ya estaba, se agregan cantidades
    const store = useCartStore.getState()
    for (const it of res.items) {
      const existente = store.items.find(x => (x.itemKey ?? `${x.productoId}:`) === it.itemKey)
      if (existente) {
        useCartStore.getState().updateCantidad(it.itemKey, existente.cantidad + it.cantidad)
      } else {
        useCartStore.getState().add({
          productoId: it.productoId,
          itemKey: it.itemKey,
          codigo_interno: it.codigo_interno,
          titulo: it.titulo,
          precio: it.precio,
          multiplo: it.multiplo,
          foto_url: it.foto_url,
          variante: it.variante,
          stock: it.stock,
        })
        useCartStore.getState().updateCantidad(it.itemKey, it.cantidad)
      }
    }

    if (res.omitidos > 0) {
      // Dar tiempo a leer el aviso antes de navegar
      setError(`${res.omitidos} producto${res.omitidos !== 1 ? 's' : ''} del pedido original ya no ${res.omitidos !== 1 ? 'están' : 'está'} disponible${res.omitidos !== 1 ? 's' : ''}. Agregamos el resto al carrito.`)
      setTimeout(() => router.push('/carrito'), 2500)
      return
    }
    router.push('/carrito')
  }

  return (
    <div className={compact ? 'flex items-center' : 'flex flex-col gap-2'}>
      <button
        onClick={handleClick}
        disabled={cargando}
        className={
          compact
            ? 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors hover:opacity-80 disabled:opacity-50'
            : 'flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm border transition-colors hover:opacity-80 disabled:opacity-50'
        }
        style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-granito-oscuro)', background: 'white' }}
      >
        {cargando ? <Loader2 size={compact ? 12 : 14} className="animate-spin" /> : <RotateCcw size={compact ? 12 : 14} />}
        Volver a pedir
      </button>
      {error && (
        <p className="text-xs" style={{ color: '#9a3412' }}>{error}</p>
      )}
    </div>
  )
}
