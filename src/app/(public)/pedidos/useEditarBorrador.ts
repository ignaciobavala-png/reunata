'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/stores/cartStore'
import { getItemsParaRecomprar } from '@/app/actions/pedidos'

// Lleva un pedido en estado "borrador" al carrito para editarlo. A diferencia
// de "Volver a pedir", esto REEMPLAZA el carrito actual y queda atado al
// pedido original: al confirmar en /carrito se actualiza ese mismo pedido
// (mismo número) en vez de crear uno nuevo.
export function useEditarBorrador(pedidoId: string, numero: number) {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function editar() {
    if (cargando) return
    setCargando(true)
    setError(null)

    const res = await getItemsParaRecomprar(pedidoId, true)
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
      // El ítem entra entero (menos la cantidad, que se fija abajo): así los
      // campos de preventa —viaje, fecha estimada, descuento de etapa— llegan al
      // carrito sin tener que enumerarlos acá cada vez que se agrega uno.
      const { cantidad, ...linea } = it
      store.add(linea)
      store.updateCantidad(it.itemKey, cantidad)
    }

    if (res.omitidos > 0) {
      setError(`${res.omitidos} producto${res.omitidos !== 1 ? 's' : ''} de este pedido ya no ${res.omitidos !== 1 ? 'están' : 'está'} disponible${res.omitidos !== 1 ? 's' : ''} y no ${res.omitidos !== 1 ? 'se cargaron' : 'se cargó'}.`)
      setTimeout(() => router.push('/carrito'), 2500)
      return
    }
    router.push('/carrito')
  }

  return { editar, cargando, error }
}
