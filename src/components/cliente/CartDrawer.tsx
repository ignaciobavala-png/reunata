'use client'

import { useState } from 'react'
import { useCartStore, CartItem } from '@/stores/cartStore'
import { ShoppingCart, ShoppingBag, X, Plus, Minus, Trash2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { crearPedidoBorrador } from '@/app/actions/pedidos'
import { formatPrecio } from '@/lib/utils'

const WHATSAPP = '5491132720974'

function buildWhatsAppLink(items: CartItem[]) {
  const lineas = items.map(i => `• ${i.titulo} x${i.cantidad}`)
  const texto = `Hola! Me gustaría hacer un pedido:\n\n${lineas.join('\n')}\n\nQuedo a la espera, gracias!`
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`
}

export function CartDrawer({ tipoCliente, initialOpen = false }: { tipoCliente: 'mayorista' | 'minorista'; initialOpen?: boolean }) {
  const { items, remove, updateCantidad, total, totalItems, clear } = useCartStore()
  const [open, setOpen] = useState(initialOpen)
  const [enviando, setEnviando] = useState(false)
  const router = useRouter()

  const esMayorista = tipoCliente === 'mayorista'

  async function handleEnviarPedido() {
    if (items.length === 0) return
    setEnviando(true)
    try {
      const pedidoId = await crearPedidoBorrador(
        items.map(i => ({ productoId: i.productoId, cantidad: i.cantidad, precioUnit: i.precio }))
      )
      clear()
      setOpen(false)
      router.push(`/dashboard/cliente/pedidos/${pedidoId}`)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all duration-200"
        style={{ background: 'var(--color-granito-oscuro)', color: 'var(--color-acero-brillo)' }}
      >
        {esMayorista ? <ShoppingCart size={18} /> : <ShoppingBag size={18} />}
        {totalItems() > 0 && (
          <span
            className="text-xs font-medium px-1.5 py-0.5 rounded-full"
            style={{ background: 'var(--color-granito-claro)', color: 'white' }}
          >
            {totalItems()}
          </span>
        )}
        {totalItems() > 0 && (
          <span className="text-xs">{formatPrecio(total())}</span>
        )}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300"
        style={{
          width: '360px',
          background: 'white',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-acero-claro)' }}>
          <div className="flex items-center gap-2">
            {esMayorista ? <ShoppingCart size={16} style={{ color: 'var(--color-granito)' }} /> : <ShoppingBag size={16} style={{ color: 'var(--color-granito)' }} />}
            <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
              {esMayorista ? 'Mi pedido' : 'Mi carrito'}
            </span>
          </div>
          <button onClick={() => setOpen(false)}>
            <X size={16} style={{ color: 'var(--color-acero-oscuro)' }} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4" data-lenis-prevent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              {esMayorista
                ? <ShoppingCart size={28} strokeWidth={1.2} style={{ color: 'var(--color-acero-claro)' }} />
                : <ShoppingBag size={28} strokeWidth={1.2} style={{ color: 'var(--color-acero-claro)' }} />
              }
              <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                {esMayorista ? 'Tu pedido está vacío' : 'Tu carrito está vacío'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map(item => (
                <div
                  key={item.productoId}
                  className="rounded-lg border p-3"
                  style={{ borderColor: 'var(--color-acero-claro)' }}
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono truncate" style={{ color: 'var(--color-acero-oscuro)' }}>
                        {item.codigo_interno}
                      </p>
                      <p className="text-xs leading-snug mt-0.5" style={{ color: 'var(--foreground)' }}>
                        {item.titulo}
                      </p>
                    </div>
                    <button onClick={() => remove(item.productoId)}>
                      <Trash2 size={12} style={{ color: 'var(--color-acero)' }} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateCantidad(item.productoId, item.cantidad - 1)}
                        className="w-6 h-6 rounded border flex items-center justify-center"
                        style={{ borderColor: 'var(--color-acero-claro)' }}
                      >
                        <Minus size={10} />
                      </button>
                      <span className="text-xs w-6 text-center" style={{ color: 'var(--foreground)' }}>
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => updateCantidad(item.productoId, item.cantidad + 1)}
                        className="w-6 h-6 rounded border flex items-center justify-center"
                        style={{ borderColor: 'var(--color-acero-claro)' }}
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                    <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
                      {formatPrecio(item.precio * item.cantidad)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--color-acero-claro)' }}>
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm" style={{ color: 'var(--foreground)' }}>
                {esMayorista ? 'Total' : 'Total estimado'}
              </span>
              <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                {formatPrecio(total())}
              </span>
            </div>

            {esMayorista ? (
              <button
                onClick={handleEnviarPedido}
                disabled={enviando}
                className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
                style={{ background: 'var(--color-granito-oscuro)', color: 'var(--color-acero-brillo)' }}
              >
                {enviando && <Loader2 size={14} className="animate-spin" />}
                {enviando ? 'Enviando pedido…' : 'Enviar pedido'}
              </button>
            ) : (
              <>
                <a
                  href="/carrito"
                  className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-opacity"
                  style={{ background: 'var(--color-granito-oscuro)', color: 'var(--color-acero-brillo)' }}
                >
                  Ver carrito y finalizar
                </a>
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}
