'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil } from 'lucide-react'
import { useCartStore } from '@/stores/cartStore'
import { getItemsParaRecomprar } from '@/app/actions/pedidos'

// Lleva un pedido en estado "borrador" al carrito para editarlo. A diferencia
// de "Volver a pedir", esto REEMPLAZA el carrito actual y queda atado al
// pedido original: al confirmar en /carrito se actualiza ese mismo pedido
// (mismo número) en vez de crear uno nuevo.
export function EditarBorradorButton({ pedidoId, numero, compact = false }: { pedidoId: string; numero: number; compact?: boolean }) {
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

    const store = useCartStore.getState()
    store.startEditingPedido(pedidoId, numero)
    for (const it of res.items) {
      store.add({
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
      store.updateCantidad(it.itemKey, it.cantidad)
    }

    if (res.omitidos > 0) {
      setError(`${res.omitidos} producto${res.omitidos !== 1 ? 's' : ''} de este pedido ya no ${res.omitidos !== 1 ? 'están' : 'está'} disponible${res.omitidos !== 1 ? 's' : ''} y no ${res.omitidos !== 1 ? 'se cargaron' : 'se cargó'}.`)
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
        {cargando ? <Loader2 size={compact ? 12 : 14} className="animate-spin" /> : <Pencil size={compact ? 12 : 14} />}
        Editar pedido
      </button>
      {error && (
        <p className="text-xs" style={{ color: '#9a3412' }}>{error}</p>
      )}
    </div>
  )
}
