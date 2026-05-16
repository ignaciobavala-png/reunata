import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productoId: number
  codigo_interno: string
  titulo: string
  precio: number
  cantidad: number
  foto_url?: string | null
}

interface CartStore {
  items: CartItem[]
  cartOpen: boolean
  setCartOpen: (open: boolean) => void
  add: (item: Omit<CartItem, 'cantidad'>) => void
  remove: (productoId: number) => void
  updateCantidad: (productoId: number, cantidad: number) => void
  clear: () => void
  total: () => number
  totalItems: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      cartOpen: false,
      setCartOpen: (open) => set({ cartOpen: open }),

      add: (item) => set(state => {
        const existe = state.items.find(i => i.productoId === item.productoId)
        if (existe) {
          return {
            items: state.items.map(i =>
              i.productoId === item.productoId
                ? { ...i, cantidad: i.cantidad + 1 }
                : i
            ),
          }
        }
        return { items: [...state.items, { ...item, cantidad: 1 }] }
      }),

      remove: (productoId) => set(state => ({
        items: state.items.filter(i => i.productoId !== productoId),
      })),

      updateCantidad: (productoId, cantidad) => set(state => {
        if (cantidad <= 0) return { items: state.items.filter(i => i.productoId !== productoId) }
        return { items: state.items.map(i => i.productoId === productoId ? { ...i, cantidad } : i) }
      }),

      clear: () => set({ items: [] }),

      total: () => get().items.reduce((acc, i) => acc + i.precio * i.cantidad, 0),

      totalItems: () => get().items.reduce((acc, i) => acc + i.cantidad, 0),
    }),
    { name: 'reunata-cart' }
  )
)
