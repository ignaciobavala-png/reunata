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
  stock?: number | null // stock disponible para limitar el stepper del drawer
}

// Maneja ítems viejos (sin itemKey) del localStorage
const ik = (i: CartItem) => i.itemKey ?? `${i.productoId}:`

interface CartStore {
  items: CartItem[]
  ownerId: string | null
  cartOpen: boolean
  guestItemsMerged: boolean
  editingPedidoId: string | null
  editingPedidoNumero: number | null
  setCartOpen: (open: boolean) => void
  add: (item: Omit<CartItem, 'cantidad'>) => void
  remove: (itemKey: string) => void
  updateCantidad: (itemKey: string, cantidad: number) => void
  updatePrecios: (precios: Record<number, number>) => void
  updateStocks: (stocksPorItemKey: Record<string, number | null>) => void
  clear: () => void
  setOwner: (userId: string | null) => void
  clearIfOwnerChanged: (userId: string | null) => void
  clearGuestMergedFlag: () => void
  startEditingPedido: (pedidoId: string, numero: number) => void
  stopEditingPedido: () => void
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
      editingPedidoId: null,
      editingPedidoNumero: null,
      setCartOpen: (open) => set({ cartOpen: open }),

      add: (item) => set(state => {
        const multiplo = item.multiplo ?? 1
        const key = item.itemKey
        const existe = state.items.find(i => ik(i) === key)
        if (existe) {
          return {
            items: state.items.map(i => {
              if (ik(i) !== key) return i
              const nueva = i.cantidad + multiplo
              return { ...i, cantidad: i.stock != null ? Math.min(nueva, Math.max(i.stock, 0)) : nueva }
            }),
          }
        }
        const cantidadInicial = item.stock != null ? Math.min(multiplo, Math.max(item.stock, 0)) : multiplo
        // Sin stock disponible no se agrega nada — un ítem con cantidad 0 queda
        // invisible en los totales pero viaja igual al pedido.
        if (cantidadInicial <= 0) return state
        return { items: [...state.items, { ...item, multiplo, cantidad: cantidadInicial }] }
      }),

      remove: (itemKey) => set(state => ({
        items: state.items.filter(i => ik(i) !== itemKey),
      })),

      // Última línea de defensa: sin importar quién llame esto (stepper, drawer,
      // localStorage editado a mano), nunca se persiste más cantidad que el stock conocido del ítem.
      updateCantidad: (itemKey, cantidad) => set(state => {
        if (cantidad <= 0) return { items: state.items.filter(i => ik(i) !== itemKey) }
        return {
          items: state.items.map(i => {
            if (ik(i) !== itemKey) return i
            const clamped = i.stock != null ? Math.min(cantidad, Math.max(i.stock, 0)) : cantidad
            return { ...i, cantidad: clamped }
          }),
        }
      }),

      updatePrecios: (precios) => set(state => ({
        items: state.items.map(i =>
          i.productoId in precios ? { ...i, precio: precios[i.productoId] } : i
        ),
      })),

      // Refresca el stock conocido de cada ítem (por itemKey) y reclampa la cantidad si bajó.
      // Piso en 0: un stock negativo desde el server nunca debe producir cantidades negativas.
      updateStocks: (stocksPorItemKey) => set(state => ({
        items: state.items.map(i => {
          const key = ik(i)
          if (!(key in stocksPorItemKey)) return i
          const raw = stocksPorItemKey[key]
          const stock = raw != null ? Math.max(raw, 0) : null
          const cantidad = stock != null ? Math.min(i.cantidad, stock) : i.cantidad
          return { ...i, stock, cantidad }
        }),
      })),

      clear: () => set({ items: [], ownerId: null, editingPedidoId: null, editingPedidoNumero: null }),

      setOwner: (userId) => set({ ownerId: userId }),

      clearIfOwnerChanged: (userId) => {
        const current = get().ownerId
        if (current !== null && current !== userId) {
          set({ items: [], ownerId: userId, editingPedidoId: null, editingPedidoNumero: null })
        } else if (current === null && get().items.length > 0) {
          set({ ownerId: userId, guestItemsMerged: true })
        } else {
          set({ ownerId: userId })
        }
      },

      clearGuestMergedFlag: () => set({ guestItemsMerged: false }),

      // Reemplaza el carrito por el de un pedido borrador existente — confirmar
      // actualiza ese mismo pedido en vez de crear uno nuevo (edición in-place).
      startEditingPedido: (pedidoId, numero) => set({ items: [], editingPedidoId: pedidoId, editingPedidoNumero: numero }),
      stopEditingPedido: () => set({ editingPedidoId: null, editingPedidoNumero: null }),

      total: () => get().items.reduce((acc, i) => acc + i.precio * i.cantidad, 0),
      totalItems: () => get().items.reduce((acc, i) => acc + i.cantidad, 0),
    }),
    {
      name: 'reunata-cart',
      partialize: (state) => ({
        items: state.items,
        ownerId: state.ownerId,
        guestItemsMerged: state.guestItemsMerged,
        editingPedidoId: state.editingPedidoId,
        editingPedidoNumero: state.editingPedidoNumero,
      }),
    }
  )
)
