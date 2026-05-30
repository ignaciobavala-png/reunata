'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trash2, Minus, Plus, ShoppingBag, Loader2 } from 'lucide-react'
import { useCartStore } from '@/stores/cartStore'
import { iniciarCheckoutMP } from '@/app/actions/checkout'

const WA_NUMBER = '5491132720974'
const ROLES_MAYORISTAS = ['distribuidor', 'local', 'mercha']

interface PageUser {
  nombre: string | null
  rol: string
}

function buildWhatsAppMsg(items: ReturnType<typeof useCartStore.getState>['items']) {
  const lineas = items.map(i =>
    `• ${i.titulo} (${i.codigo_interno}) × ${i.cantidad}`
  ).join('\n')
  return encodeURIComponent(`Hola, quiero hacer un pedido:\n\n${lineas}\n\nPor favor confirmame disponibilidad y precio.`)
}

export function CartClient({ user }: { user: PageUser | null }) {
  const { items, remove, updateCantidad, clear, total } = useCartStore()
  const [mounted, setMounted] = useState(false)
  const [pagando, setPagando] = useState(false)
  const [errorPago, setErrorPago] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => { setMounted(true) }, [])

  const esMinorista = user?.rol === 'consumidor_final'
  const esMayorista = user?.rol ? ROLES_MAYORISTAS.includes(user.rol) : false

  function handleMenos(productoId: number, cantidad: number, multiplo: number) {
    const nueva = cantidad - multiplo
    if (nueva <= 0) remove(productoId)
    else updateCantidad(productoId, nueva)
  }

  function handleInput(productoId: number, value: string, multiplo: number) {
    const n = parseInt(value)
    if (isNaN(n) || n <= 0) return
    const redondeado = Math.ceil(n / multiplo) * multiplo
    updateCantidad(productoId, redondeado)
  }

  async function handlePagarMP() {
    if (!items.length || pagando) return
    setPagando(true)
    setErrorPago(null)
    const result = await iniciarCheckoutMP(
      items.map(i => ({ productoId: i.productoId, cantidad: i.cantidad }))
    )
    if (result.ok && result.init_point) {
      clear()
      window.location.href = result.init_point
    } else {
      setErrorPago(result.error ?? 'Error inesperado. Intentá de nuevo.')
      setPagando(false)
    }
  }

  if (!mounted) return null

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 pt-24">
        <ShoppingBag size={48} strokeWidth={1} style={{ color: 'var(--color-acero-claro)' }} />
        <div className="text-center">
          <p className="text-xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
            Tu carrito está vacío
          </p>
          <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
            Explorá el catálogo y agregá productos.
          </p>
        </div>
        <Link
          href="/tienda"
          className="px-6 py-3 text-xs tracking-widest uppercase transition-colors"
          style={{ background: 'var(--color-granito-oscuro)', color: 'var(--color-acero-brillo)' }}
        >
          Ver catálogo
        </Link>
      </div>
    )
  }

  const totalGeneral = total()

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 md:px-10 max-w-5xl mx-auto">
      <h1 className="text-2xl mb-8" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Mi carrito
      </h1>

      <div className="flex flex-col lg:flex-row gap-8 items-start">

        {/* Lista de ítems */}
        <div className="flex-1 flex flex-col gap-3">
          {items.map(item => {
            const multiplo = item.multiplo ?? 1
            const subtotal = item.precio * item.cantidad
            return (
              <div
                key={item.productoId}
                className="flex gap-4 p-4 rounded-xl border"
                style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}
              >
                {/* Foto */}
                <div
                  className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden"
                  style={{ background: 'var(--color-acero-brillo)' }}
                >
                  {item.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.foto_url}
                      alt={item.titulo}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag size={20} style={{ color: 'var(--color-acero-oscuro)' }} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-mono" style={{ color: 'var(--color-acero-oscuro)' }}>
                    {item.codigo_interno}
                  </p>
                  <p className="text-sm font-medium leading-snug mt-0.5 line-clamp-2" style={{ color: 'var(--foreground)' }}>
                    {item.titulo}
                  </p>

                  {item.precio > 0 && (
                    <p className="text-xs mt-1" style={{ color: 'var(--color-acero-oscuro)' }}>
                      u$s {item.precio.toFixed(2)} c/u
                    </p>
                  )}

                  {/* Stepper */}
                  <div className="flex items-center gap-3 mt-3">
                    <div
                      className="flex items-center rounded-lg overflow-hidden"
                      style={{ border: '1px solid var(--color-acero-claro)', background: 'var(--color-acero-brillo)' }}
                    >
                      <button
                        onClick={() => handleMenos(item.productoId, item.cantidad, multiplo)}
                        className="w-8 h-8 flex items-center justify-center transition-colors hover:bg-[var(--color-acero-claro)]"
                        style={{ color: 'var(--color-granito)' }}
                        aria-label="Reducir cantidad"
                      >
                        <Minus size={12} strokeWidth={2.5} />
                      </button>
                      <input
                        type="number"
                        value={item.cantidad}
                        min={multiplo}
                        step={multiplo}
                        onChange={e => handleInput(item.productoId, e.target.value, multiplo)}
                        className="w-12 text-center text-sm font-semibold tabular-nums outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        style={{ color: 'var(--foreground)' }}
                      />
                      <button
                        onClick={() => updateCantidad(item.productoId, item.cantidad + multiplo)}
                        className="w-8 h-8 flex items-center justify-center transition-colors hover:bg-[var(--color-acero-claro)]"
                        style={{ color: 'var(--color-granito)' }}
                        aria-label="Aumentar cantidad"
                      >
                        <Plus size={12} strokeWidth={2.5} />
                      </button>
                    </div>
                    {multiplo > 1 && (
                      <span className="text-[10px]" style={{ color: 'var(--color-acero-oscuro)' }}>
                        múltiplo de {multiplo}
                      </span>
                    )}
                  </div>
                </div>

                {/* Subtotal + eliminar */}
                <div className="flex flex-col items-end justify-between flex-shrink-0">
                  {item.precio > 0 && (
                    <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--foreground)' }}>
                      u$s {subtotal.toFixed(2)}
                    </p>
                  )}
                  <button
                    onClick={() => remove(item.productoId)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-red-50"
                    style={{ color: 'var(--color-acero-oscuro)' }}
                    aria-label="Eliminar producto"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}

          <button
            onClick={() => router.push('/tienda')}
            className="text-xs tracking-wide mt-2 self-start"
            style={{ color: 'var(--color-acero-oscuro)' }}
          >
            ← Seguir comprando
          </button>
        </div>

        {/* Resumen */}
        <div
          className="w-full lg:w-72 rounded-xl border p-5 flex flex-col gap-4 lg:sticky lg:top-28"
          style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Resumen del pedido</p>

          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between" style={{ color: 'var(--color-acero-oscuro)' }}>
              <span>{items.length} {items.length === 1 ? 'producto' : 'productos'}</span>
              <span>{items.reduce((a, i) => a + i.cantidad, 0)} unidades</span>
            </div>
            {totalGeneral > 0 && (
              <>
                <div className="h-px my-1" style={{ background: 'var(--color-acero-claro)' }} />
                <div className="flex justify-between font-semibold" style={{ color: 'var(--foreground)' }}>
                  <span>Total</span>
                  <span>u$s {totalGeneral.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>

          <div className="h-px" style={{ background: 'var(--color-acero-claro)' }} />

          {/* CTA según rol */}
          {esMinorista ? (
            <>
              <button
                onClick={handlePagarMP}
                disabled={pagando}
                className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                style={{ background: '#009ee3', color: 'white' }}
              >
                {pagando ? (
                  <><Loader2 size={15} className="animate-spin" /> Redirigiendo…</>
                ) : (
                  'Pagar con Mercado Pago'
                )}
              </button>
              {errorPago && (
                <p className="text-xs text-center" style={{ color: '#ef4444' }}>{errorPago}</p>
              )}
            </>
          ) : esMayorista ? (
            <a
              href={`https://wa.me/${WA_NUMBER}?text=${buildWhatsAppMsg(items)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-lg text-sm font-medium text-center flex items-center justify-center gap-2 transition-opacity"
              style={{ background: '#25D366', color: 'white' }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Pedir por WhatsApp
            </a>
          ) : user ? (
            <p className="text-xs text-center" style={{ color: 'var(--color-acero-oscuro)' }}>
              Contactanos para completar tu pedido.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-center" style={{ color: 'var(--color-acero-oscuro)' }}>
                Iniciá sesión para ver precios y hacer tu pedido.
              </p>
              <Link
                href="/login?next=/carrito"
                className="w-full py-3 rounded-lg text-sm font-medium text-center transition-opacity"
                style={{ background: 'var(--color-granito-oscuro)', color: 'var(--color-acero-brillo)' }}
              >
                Iniciar sesión
              </Link>
              <Link
                href="/registro"
                className="w-full py-2.5 rounded-lg text-xs text-center border transition-opacity"
                style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}
              >
                ¿No tenés cuenta? Registrate
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
