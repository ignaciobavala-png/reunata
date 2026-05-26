'use client'

import { useState, useEffect } from 'react'
import { useCartStore } from '@/stores/cartStore'
import { iniciarCheckoutMP } from '@/app/actions/checkout'
import { ShoppingBag, X, Trash2, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface CartUser {
  nombre: string | null
  rol: string
}

export function PublicCartDrawer({ user }: { user?: CartUser | null }) {
  const { items, remove, totalItems, total, clear, cartOpen, setCartOpen } = useCartStore()
  const [mounted, setMounted] = useState(false)
  const [pagando, setPagando] = useState(false)
  const [errorPago, setErrorPago] = useState<string | null>(null)
  const open = cartOpen
  const setOpen = setCartOpen

  useEffect(() => { setMounted(true) }, [])

  const esMinorista = user?.rol === 'consumidor_final'

  async function handlePagarMP() {
    if (!items.length || pagando) return
    setPagando(true)
    setErrorPago(null)
    const result = await iniciarCheckoutMP(
      items.map(i => ({ productoId: i.productoId, cantidad: i.cantidad }))
    )
    if (result.ok && result.init_point) {
      clear()
      setOpen(false)
      window.location.href = result.init_point
    } else {
      setErrorPago(result.error ?? 'Error inesperado. Intentá de nuevo.')
      setPagando(false)
    }
  }

  if ((!mounted || totalItems() === 0) && !open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all duration-200"
        style={{ background: 'var(--color-granito-oscuro)', color: 'var(--color-acero-brillo)' }}
      >
        <ShoppingBag size={18} />
      </button>
    )
  }

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all duration-200"
        style={{ background: 'var(--color-granito-oscuro)', color: 'var(--color-acero-brillo)' }}
      >
        <ShoppingBag size={18} />
        {mounted && totalItems() > 0 && (
          <>
            <span
              className="text-xs font-medium px-1.5 py-0.5 rounded-full"
              style={{ background: '#10b981', color: 'white' }}
            >
              {totalItems()}
            </span>
            <span className="text-xs">{totalItems()} {totalItems() === 1 ? 'producto' : 'productos'}</span>
          </>
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
            <ShoppingBag size={16} style={{ color: 'var(--color-granito)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
              Mi carrito
            </span>
          </div>
          <button onClick={() => setOpen(false)}>
            <X size={16} style={{ color: 'var(--color-acero-oscuro)' }} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <ShoppingBag size={28} strokeWidth={1.2} style={{ color: 'var(--color-acero-claro)' }} />
              <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                Tu carrito está vacío
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map(item => (
                <div
                  key={item.productoId}
                  className="rounded-lg border p-3 flex items-start justify-between gap-2"
                  style={{ borderColor: 'var(--color-acero-claro)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono truncate" style={{ color: 'var(--color-acero-oscuro)' }}>
                      {item.codigo_interno}
                    </p>
                    <p className="text-xs leading-snug mt-0.5" style={{ color: 'var(--foreground)' }}>
                      {item.titulo}
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--color-acero-oscuro)' }}>
                      Cant: {item.cantidad}
                    </p>
                  </div>
                  <button onClick={() => remove(item.productoId)} className="mt-0.5 flex-shrink-0">
                    <Trash2 size={12} style={{ color: 'var(--color-acero)' }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex flex-col gap-3" style={{ borderColor: 'var(--color-acero-claro)' }}>
          {items.length > 0 ? (
            <>
              {/* Total — solo para minoristas con sesión */}
              {esMinorista && (
                <div className="flex justify-between items-center text-sm">
                  <span style={{ color: 'var(--color-acero-oscuro)' }}>Total</span>
                  <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                    ${total().toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {/* Botón principal */}
              {esMinorista ? (
                <button
                  onClick={handlePagarMP}
                  disabled={pagando}
                  className="w-full py-3 rounded-lg text-sm font-medium text-center flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                  style={{ background: '#009ee3', color: 'white' }}
                >
                  {pagando ? (
                    <><Loader2 size={15} className="animate-spin" /> Redirigiendo…</>
                  ) : (
                    'Pagar con Mercado Pago'
                  )}
                </button>
              ) : user ? (
                <p className="text-xs text-center" style={{ color: 'var(--color-acero-oscuro)' }}>
                  Para completar tu pedido, contactanos por WhatsApp.
                </p>
              ) : null}

              {/* Error */}
              {errorPago && (
                <p className="text-xs text-center" style={{ color: '#ef4444' }}>{errorPago}</p>
              )}

              {/* Continuar comprando */}
              <Link
                href="/tienda"
                onClick={() => setOpen(false)}
                className="block w-full py-2.5 rounded-lg text-xs text-center border transition-opacity"
                style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}
              >
                Continuar comprando
              </Link>

              {/* Login prompts */}
              {!user && (
                <div className="flex flex-col gap-2 pt-1 border-t" style={{ borderColor: 'var(--color-acero-claro)' }}>
                  <p className="text-xs text-center" style={{ color: 'var(--color-acero-oscuro)' }}>
                    Iniciá sesión para ver precios y pagar.
                  </p>
                  <Link
                    href="/login?next=/tienda"
                    onClick={() => setOpen(false)}
                    className="block w-full py-2.5 rounded-lg text-xs font-medium text-center border transition-opacity"
                    style={{ borderColor: 'var(--color-granito-oscuro)', color: 'var(--color-granito-oscuro)' }}
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/registro"
                    onClick={() => setOpen(false)}
                    className="block w-full py-2.5 rounded-lg text-xs text-center border transition-opacity"
                    style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}
                  >
                    ¿No tenés cuenta? Registrate
                  </Link>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-center" style={{ color: 'var(--color-acero-oscuro)' }}>
              Agregá productos para continuar.
            </p>
          )}
        </div>
      </div>
    </>
  )
}
