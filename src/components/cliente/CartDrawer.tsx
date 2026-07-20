'use client'

import { useState, useEffect } from 'react'
import { useCartStore, CartItem } from '@/stores/cartStore'
import { ShoppingCart, ShoppingBag, X, Loader2, Trash2 } from 'lucide-react'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { crearPedidoBorrador } from '@/app/actions/pedidos'
import { formatPrecio } from '@/lib/utils'
import { VarianteBadge } from '@/components/sections/ColorPicker'
import { tramosPendientes, type ConfigVolumen } from '@/lib/descuento-volumen'

// Solo lo que el drawer necesita para los avisos de mínimo y volumen; el detalle
// fino (base post-descuentos) vive en la página /carrito, acá es un adelanto.
type ReglasDrawer = ConfigVolumen & { minimo_compra: number | null }

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
  const [reglas, setReglas] = useState<ReglasDrawer | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  const esMayorista = tipoCliente === 'mayorista'

  // Reglas del canal para los avisos de mínimo de compra y descuento por volumen.
  // Mismo endpoint que la página /carrito; se carga una vez al montar el drawer.
  useEffect(() => {
    fetch('/api/carrito/reglas')
      .then(r => r.json())
      .then(({ reglas: r }) => { if (r) setReglas(r as ReglasDrawer) })
      .catch(() => {})
  }, [])

  // El total del drawer es el subtotal bruto (sin descuentos): sirve de referencia
  // para los umbrales de volumen (que se evalúan sobre el bruto, igual que en /carrito)
  // y como cota superior para el mínimo — la página /carrito hace el cálculo exacto.
  const totalActual = total()
  const tramosVolPend = tramosPendientes(reglas, totalActual)
  const minimo = reglas?.minimo_compra ?? null
  const faltaMinimo = minimo != null && totalActual < minimo ? minimo - totalActual : null

  // En la página de carrito completo el drawer es redundante
  if (pathname === '/carrito') return null

  async function handleEnviarPedido() {
    if (items.length === 0) return
    setEnviando(true)
    setErrorEnvio(null)
    const result = await crearPedidoBorrador(
      items.map(i => ({ productoId: i.productoId, cantidad: i.cantidad, variante: i.variante }))
    )
    if (result.ok && result.pedidoId) {
      clear()
      setCartOpen(false)
      router.push(`/pedidos/${result.pedidoId}`)
    } else {
      setErrorEnvio(result.error ?? 'Error al enviar el pedido. Intentá de nuevo.')
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
                      <Link
                        href={`/tienda/p/${item.productoId}`}
                        onClick={() => setCartOpen(false)}
                        className="text-xs leading-snug mt-0.5 block hover:underline"
                        style={{ color: 'var(--foreground)' }}
                      >
                        {item.titulo}
                      </Link>
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
                    <QuantityStepper
                      size="sm"
                      value={item.cantidad}
                      multiplo={item.multiplo ?? 1}
                      max={item.stock ?? null}
                      plusDisabled={item.stock != null && item.cantidad + (item.multiplo ?? 1) > item.stock}
                      onCommit={n => updateCantidad(item.itemKey ?? `${item.productoId}:`, n)}
                      onRemove={() => remove(item.itemKey ?? `${item.productoId}:`)}
                    />
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
            {/* Avisos de mínimo de compra y descuento por volumen — para que se
                vean sin tener que entrar al carrito completo (pedido del tester) */}
            {(faltaMinimo !== null || tramosVolPend.length > 0) && (
              <div className="flex flex-col gap-1.5 mb-3">
                {faltaMinimo !== null && (
                  <div className="px-3 py-2 rounded-lg text-xs" style={{ background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa' }}>
                    Mínimo de compra: {formatPrecio(minimo!)}. Te faltan {formatPrecio(faltaMinimo)}.
                  </div>
                )}
                {tramosVolPend.map(t => (
                  <div key={t.montoMin} className="px-3 py-2 rounded-lg text-xs" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                    Te faltan {formatPrecio(t.montoMin - totalActual)} para el {t.pct}% de descuento por volumen.
                  </div>
                ))}
              </div>
            )}
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
                  <div className="flex flex-col gap-2">
                    <a
                      href="/carrito"
                      className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-opacity"
                      style={{ background: 'var(--color-granito-oscuro)', color: 'var(--color-acero-brillo)' }}
                    >
                      Ver carrito y finalizar
                    </a>
                    <button
                      onClick={handleEnviarPedido}
                      disabled={enviando}
                      className="w-full py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-60 transition-opacity border"
                      style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)', background: 'transparent' }}
                    >
                      {enviando && <Loader2 size={12} className="animate-spin" />}
                      {enviando ? 'Enviando…' : 'Enviar borrador sin confirmar'}
                    </button>
                    {errorEnvio && (
                      <p className="text-xs text-center" style={{ color: '#ef4444' }}>{errorEnvio}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-center py-2" style={{ color: 'var(--color-acero-oscuro)' }}>
                    Tu cuenta está pendiente de aprobación.
                  </p>
                )}
                <div className="h-px mt-1" style={{ background: 'var(--color-acero-claro)' }} />
                <a
                  href="/cuenta/financiacion"
                  onClick={() => setCartOpen(false)}
                  className="w-full py-2 rounded-lg text-xs text-center transition-colors"
                  style={{ color: 'var(--color-acero-oscuro)' }}
                >
                  ¿Necesitás financiamiento? <span className="underline">Solicitalo acá →</span>
                </a>
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
