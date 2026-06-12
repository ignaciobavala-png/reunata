import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productoId: number
  itemKey: string       // `${productoId}:${variante ?? ''}` — clave única compuesta
  codigo_interno: string
  titulo: string
  precio: number
  cantidad: number
  multiplo?: number
  foto_url?: string | null
  variante?: string     // color/variante elegida, ej: "NEGRO", "VERDE"
}

// Maneja ítems viejos (sin itemKey) del localStorage
const ik = (i: CartItem) => i.itemKey ?? `${i.productoId}:`

interface CartStore {
  items: CartItem[]
  ownerId: string | null
  cartOpen: boolean
  guestItemsMerged: boolean
  setCartOpen: (open: boolean) => void
  add: (item: Omit<CartItem, 'cantidad'>) => void
  remove: (itemKey: string) => void
  updateCantidad: (itemKey: string, cantidad: number) => void
  updatePrecios: (precios: Record<number, number>) => void
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
        const key = item.itemKey
        const existe = state.items.find(i => ik(i) === key)
        if (existe) {
          return {
            items: state.items.map(i =>
              ik(i) === key
                ? { ...i, cantidad: i.cantidad + multiplo }
                : i
            ),
          }
        }
        return { items: [...state.items, { ...item, multiplo, cantidad: multiplo }] }
      }),

      remove: (itemKey) => set(state => ({
        items: state.items.filter(i => ik(i) !== itemKey),
      })),

      updateCantidad: (itemKey, cantidad) => set(state => {
        if (cantidad <= 0) return { items: state.items.filter(i => ik(i) !== itemKey) }
        return { items: state.items.map(i => ik(i) === itemKey ? { ...i, cantidad } : i) }
      }),

      updatePrecios: (precios) => set(state => ({
        items: state.items.map(i =>
          i.productoId in precios ? { ...i, precio: precios[i.productoId] } : i
        ),
      })),

      clear: () => set({ items: [], ownerId: null }),

      setOwner: (userId) => set({ ownerId: userId }),

      clearIfOwnerChanged: (userId) => {
        const current = get().ownerId
        if (current !== null && current !== userId) {
          set({ items: [], ownerId: userId })
        } else if (current === null && get().items.length > 0) {
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
