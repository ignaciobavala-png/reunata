'use client'

import { useState } from 'react'
import { useCartStore, CartItem } from '@/stores/cartStore'
import { ShoppingCart, ShoppingBag, X, Plus, Minus, Trash2, Loader2 } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { crearPedidoBorrador } from '@/app/actions/pedidos'
import { formatPrecio } from '@/lib/utils'
import { VarianteBadge } from '@/components/sections/ColorPicker'

const WHATSAPP = '5491132720974'

function buildWhatsAppLink(items: CartItem[]) {
  const lineas = items.map(i => `• ${i.titulo}${i.variante ? ` (${i.variante})` : ''} x${i.cantidad}`)
  const texto = `Hola! Me gustaría hacer un pedido:\n\n${lineas.join('\n')}\n\nQuedo a la espera, gracias!`
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`
}

export function CartDrawer({ tipoCliente, aprobado = true }: { tipoCliente: 'mayorista' | 'minorista'; aprobado?: boolean }) {
  const { items, remove, updateCantidad, total, totalItems, clear, cartOpen, setCartOpen } = useCartStore()
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  const esMayorista = tipoCliente === 'mayorista'

  // En la página de carrito completo el drawer es redundante
  if (pathname === '/carrito') return null

  async function handleEnviarPedido() {
    if (items.length === 0) return
    setEnviando(true)
    setErrorEnvio(null)
    try {
      const pedidoId = await crearPedidoBorrador(
        items.map(i => ({ productoId: i.productoId, cantidad: i.cantidad, variante: i.variante }))
      )
      clear()
      setCartOpen(false)
      router.push(`/dashboard/cliente/pedidos/${pedidoId}`)
    } catch (e) {
      setErrorEnvio(e instanceof Error ? e.message : 'Error al enviar el pedido. Intentá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      {/* Overlay */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setCartOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300"
        style={{
          width: '360px',
          background: 'white',
          transform: cartOpen ? 'translateX(0)' : 'translateX(100%)',
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
          <button onClick={() => setCartOpen(false)} aria-label="Cerrar carrito">
            <X size={16} aria-hidden="true" style={{ color: 'var(--color-acero-oscuro)' }} />
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
                  key={item.itemKey ?? `${item.productoId}:`}
                  className="flex gap-3 rounded-lg border p-3"
                  style={{ borderColor: 'var(--color-acero-claro)' }}
                >
                  {/* Foto */}
                  <div
                    className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden"
                    style={{ background: 'var(--color-acero-brillo)' }}
                  >
                    {item.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.foto_url} alt={item.titulo} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag size={18} style={{ color: 'var(--color-acero-oscuro)' }} />
                      </div>
                    )}
                  </div>

                  {/* Info + controles */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono truncate" style={{ color: 'var(--color-acero-oscuro)' }}>
                        {item.codigo_interno}
                      </p>
                      <p className="text-xs leading-snug mt-0.5" style={{ color: 'var(--foreground)' }}>
                        {item.titulo}
                      </p>
                      {item.variante && (
                        <div className="mt-1">
                          <VarianteBadge variante={item.variante} />
                        </div>
                      )}
                    </div>
                    <button onClick={() => remove(item.itemKey ?? `${item.productoId}:`)} aria-label={`Eliminar ${item.titulo}`}>
                      <Trash2 size={12} aria-hidden="true" style={{ color: 'var(--color-acero)' }} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.cantidad <= (item.multiplo ?? 1) ? (
                        <button
                          onClick={() => remove(item.itemKey ?? `${item.productoId}:`)}
                          aria-label={`Eliminar ${item.titulo}`}
                          className="w-6 h-6 rounded border flex items-center justify-center"
                          style={{ borderColor: 'var(--color-acero-claro)' }}
                        >
                          <Trash2 size={10} aria-hidden="true" style={{ color: '#ef4444' }} />
                        </button>
                      ) : (
                        <button
                          onClick={() => updateCantidad(item.itemKey ?? `${item.productoId}:`, item.cantidad - (item.multiplo ?? 1))}
                          aria-label="Reducir cantidad"
                          className="w-6 h-6 rounded border flex items-center justify-center"
                          style={{ borderColor: 'var(--color-acero-claro)' }}
                        >
                          <Minus size={10} aria-hidden="true" />
                        </button>
                      )}
                      <span className="text-xs w-6 text-center" style={{ color: 'var(--foreground)' }}>
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => updateCantidad(item.itemKey ?? `${item.productoId}:`, item.cantidad + (item.multiplo ?? 1))}
                        aria-label="Aumentar cantidad"
                        className="w-6 h-6 rounded border flex items-center justify-center"
                        style={{ borderColor: 'var(--color-acero-claro)' }}
                      >
                        <Plus size={10} aria-hidden="true" />
                      </button>
                    </div>
                    <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
                      {formatPrecio(item.precio * item.cantidad)}
                    </span>
                  </div>
                  </div> {/* fin flex-1 */}
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
              <>
                {aprobado ? (
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
                  <p className="text-xs text-center py-2" style={{ color: 'var(--color-acero-oscuro)' }}>
                    Tu cuenta está pendiente de aprobación.
                  </p>
                )}
                {errorEnvio && (
                  <p className="text-xs mt-2 text-center" style={{ color: '#ef4444' }}>{errorEnvio}</p>
                )}
              </>
            ) : (
              <a
                href="/carrito"
                className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-opacity"
                style={{ background: 'var(--color-granito-oscuro)', color: 'var(--color-acero-brillo)' }}
              >
                Ver carrito y finalizar
              </a>
            )}
          </div>
        )}
      </div>
    </>
  )
}
