import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productoId: number
  codigo_interno: string
  titulo: string
  precio: number
  cantidad: number
  multiplo?: number
  foto_url?: string | null
}

interface CartStore {
  items: CartItem[]
  ownerId: string | null
  cartOpen: boolean
  guestItemsMerged: boolean
  setCartOpen: (open: boolean) => void
  add: (item: Omit<CartItem, 'cantidad'>) => void
  remove: (productoId: number) => void
  updateCantidad: (productoId: number, cantidad: number) => void
  clear: () => void
  setOwner: (userId: string | null) => void
  clearIfOwnerChanged: (userId: string | null) => void
  clearGuestMergedFlag: () => void
  total: () => number
  totalItems: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      ownerId: null,
      cartOpen: false,
      guestItemsMerged: false,
      setCartOpen: (open) => set({ cartOpen: open }),

      add: (item) => set(state => {
        const multiplo = item.multiplo ?? 1
        const existe = state.items.find(i => i.productoId === item.productoId)
        if (existe) {
          return {
            items: state.items.map(i =>
              i.productoId === item.productoId
                ? { ...i, cantidad: i.cantidad + multiplo }
                : i
            ),
          }
        }
        return { items: [...state.items, { ...item, multiplo, cantidad: multiplo }] }
      }),

      remove: (productoId) => set(state => ({
        items: state.items.filter(i => i.productoId !== productoId),
      })),

      updateCantidad: (productoId, cantidad) => set(state => {
        if (cantidad <= 0) return { items: state.items.filter(i => i.productoId !== productoId) }
        return { items: state.items.map(i => i.productoId === productoId ? { ...i, cantidad } : i) }
      }),

      clear: () => set({ items: [], ownerId: null }),

      setOwner: (userId) => set({ ownerId: userId }),

      clearIfOwnerChanged: (userId) => {
        const current = get().ownerId
        if (current !== null && current !== userId) {
          // Cambio de usuario: vaciar carrito del usuario anterior
          set({ items: [], ownerId: userId })
        } else if (current === null && get().items.length > 0) {
          // Guest con ítems que inicia sesión: conservar ítems y avisar
          set({ ownerId: userId, guestItemsMerged: true })
        } else {
          set({ ownerId: userId })
        }
      },

      clearGuestMergedFlag: () => set({ guestItemsMerged: false }),

      total: () => get().items.reduce((acc, i) => acc + i.precio * i.cantidad, 0),

      totalItems: () => get().items.reduce((acc, i) => acc + i.cantidad, 0),
    }),
    { name: 'reunata-cart' }
  )
)
