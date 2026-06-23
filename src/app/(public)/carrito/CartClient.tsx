'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ShoppingBag, Loader2, Trash2 } from 'lucide-react'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { useCartStore } from '@/stores/cartStore'
import { iniciarCheckoutMP } from '@/app/actions/checkout'
import { formatPrecio } from '@/lib/utils'
import { EnvioCotizador, type EnvioSeleccionado } from '@/components/cliente/EnvioCotizador'
import { VarianteBadge } from '@/components/sections/ColorPicker'

const WA_NUMBER = '5491132720974'
const ROLES_MAYORISTAS = ['distribuidor', 'local', 'mercha']

const METODOS_CONTADO = ['efectivo', 'transferencia_negro', 'transferencia_blanco', 'echeq_al_dia', 'cheque_fisico_al_dia', 'cheque_fisico_financiado']
const METODO_LABEL: Record<string, string> = {
  efectivo:                 'Efectivo',
  transferencia_negro:      'Transferencia (precio base)',
  transferencia_blanco:     'Transferencia Blanco (factura A, +IVA)',
  echeq_al_dia:             'E-cheq al día',
  cheque_fisico_al_dia:     'Cheque físico al día',
  cheque_fisico_financiado: 'Cheque físico financiado',
}

interface ReglaCanal {
  pagos_habilitados:               Record<string, { activo: boolean }>
  minimo_compra:                   number | null
  desc_efectivo_pct:               number
  recargo_transf_blanco_pct:       number
  desc_transferencia_pct:          number
  desc_autogestion_primera_pct:    number
  desc_autogestion_siguientes_pct: number
  envio_gratis_desde:              number | null
  envio_amba_gratis_desde:         number | null
  cuotas_mp_sin_interes:           number
  dias_vencimiento_pedido:         number
  envio_flex_activo:               boolean
  mostrar_direccion_en_web:        boolean
  direccion_negocio:               string | null
  whatsapp_tipo:                   'bot' | 'humano'
  es_primera_compra:               boolean
  credito_aprobado:                boolean
}

interface DireccionEntrega {
  id:             string
  alias:          string
  calle:          string
  numero:         string
  piso:           string | null
  localidad:      string
  provincia:      string
  codigo_postal:  string
  predeterminada: boolean
}

interface PageUser {
  nombre: string | null
  rol: string
}

interface Props {
  user: PageUser | null
  mostrarPrecios: boolean
}

function buildWhatsAppMsg(
  items: ReturnType<typeof useCartStore.getState>['items'],
  metodo?: string | null,
  totalFinal?: number,
  direccion?: DireccionEntrega | null,
  tipo: 'bot' | 'humano' = 'bot',
) {
  const lineas = items.map(i =>
    `• ${i.titulo} (${i.codigo_interno})${i.variante ? ` — ${i.variante}` : ''} × ${i.cantidad}`
  ).join('\n')

  if (tipo === 'humano') {
    return encodeURIComponent(`Hola, quiero hacer un pedido:\n\n${lineas}\n\n¿Me podés ayudar?`)
  }

  const pagoStr = metodo ? `\nForma de pago: ${METODO_LABEL[metodo] ?? metodo}` : ''
  const totalStr = totalFinal ? `\nTotal estimado: ${totalFinal.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}` : ''
  const dirParts = direccion
    ? [direccion.calle, direccion.numero, direccion.piso, direccion.localidad, direccion.provincia, direccion.codigo_postal].filter(Boolean).join(', ')
    : null
  const dirStr = dirParts ? `\nDirección de entrega: ${dirParts}` : ''
  return encodeURIComponent(`Hola, quiero hacer un pedido:\n\n${lineas}${pagoStr}${dirStr}${totalStr}\n\nPor favor confirmame disponibilidad y precio.`)
}

export function CartClient({ user, mostrarPrecios }: Props) {
  const { items, remove, updateCantidad, updatePrecios, clear, total, guestItemsMerged, clearGuestMergedFlag } = useCartStore()
  const [confirmVaciar, setConfirmVaciar] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [pagando, setPagando] = useState(false)
  const [errorPago, setErrorPago] = useState<string | null>(null)
  const [refreshingPrecios, setRefreshingPrecios] = useState(false)
  const [preciosCambiaron, setPreciosCambiaron] = useState(false)
  const [refreshFallo, setRefreshFallo] = useState(false)
  const router = useRouter()

  // Formulario de invitado
  const [guestNombre, setGuestNombre]     = useState('')
  const [guestEmail, setGuestEmail]       = useState('')
  const [guestTelefono, setGuestTelefono] = useState('')
  const [guestErrors, setGuestErrors]     = useState<string | null>(null)
  const [guestModalOpen, setGuestModalOpen] = useState(false)

  const [envioSeleccionado, setEnvioSeleccionado] = useState<EnvioSeleccionado | null>(null)
  const [stocks, setStocks] = useState<Record<number, number | null>>({})
  const [reglas, setReglas] = useState<ReglaCanal | null>(null)
  const [metodoPago, setMetodoPago] = useState<string | null>(null)
  const [direcciones, setDirecciones] = useState<DireccionEntrega[]>([])
  const [direccionId, setDireccionId] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible') setPagando(false)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // Refrescar precios y stocks desde DB al montar
  useEffect(() => {
    if (!mounted || items.length === 0) return
    const ids = items.map(i => i.productoId)
    const preciosSnapshot = Object.fromEntries(items.map(i => [i.productoId, i.precio]))
    setRefreshingPrecios(true)
    fetch('/api/carrito/precios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
      .then(r => r.json())
      .then(({ precios, stocks: st }) => {
        if (precios) {
          const cambiaron = ids.some(
            id => precios[id] !== undefined && precios[id] !== preciosSnapshot[id]
          )
          updatePrecios(precios)
          if (cambiaron) setPreciosCambiaron(true)
        }
        if (st) setStocks(st)
        setRefreshingPrecios(false)
      })
      .catch(() => {
        setRefreshFallo(true)
        setRefreshingPrecios(false)
      })
  // Solo al montar — no re-ejecutar si items cambia
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  // Limpiar flag de merge una vez que el componente montó y el usuario lo ve
  useEffect(() => {
    if (mounted && guestItemsMerged) clearGuestMergedFlag()
  }, [mounted, guestItemsMerged, clearGuestMergedFlag])

  // Cargar reglas del canal (todos los usuarios autenticados)
  useEffect(() => {
    if (!mounted || !user) return
    fetch('/api/carrito/reglas')
      .then(r => r.json())
      .then(({ reglas: r }) => { if (r) setReglas(r) })
      .catch(() => {})
  }, [mounted, user])

  // Cargar direcciones — solo mayoristas
  useEffect(() => {
    if (!mounted || !user?.rol || !ROLES_MAYORISTAS.includes(user.rol)) return
    fetch('/api/cuenta/direcciones')
      .then(r => r.json())
      .then(({ direcciones: d }: { direcciones: DireccionEntrega[] }) => {
        setDirecciones(d)
        const predeterminada = d.find(x => x.predeterminada)
        if (predeterminada) setDireccionId(predeterminada.id)
      })
      .catch(() => {})
  }, [mounted, user?.rol])

  const esMinorista = user?.rol === 'consumidor_final'
  const esMayorista = user?.rol ? ROLES_MAYORISTAS.includes(user.rol) : false
  const esGuest     = !user

  function handleEnvioSelect(opcion: EnvioSeleccionado | null) {
    if (!opcion) { setEnvioSeleccionado(null); return }
    const totalActual = total()
    const esAmba = ['B', 'C'].includes(opcion.provincia)
    const umbralAmba = reglas?.envio_amba_gratis_desde ?? null
    const umbralGeneral = reglas?.envio_gratis_desde ?? null
    const gratis =
      (umbralAmba !== null && esAmba && totalActual >= umbralAmba) ||
      (umbralGeneral !== null && totalActual >= umbralGeneral)
    setEnvioSeleccionado(gratis ? { ...opcion, costo: 0 } : opcion)
  }


  async function handlePagarMP(guestOverride?: { nombre: string; email: string; telefono?: string }) {
    if (!items.length || pagando) return
    setPagando(true)
    setErrorPago(null)
    setGuestErrors(null)

    const result = await iniciarCheckoutMP(
      items.map(i => ({ productoId: i.productoId, cantidad: i.cantidad, variante: i.variante })),
      guestOverride,
      envioSeleccionado
        ? {
            provincia: envioSeleccionado.provincia,
            codigo_postal: envioSeleccionado.codigo_postal,
            servicioId: envioSeleccionado.servicioId,
            calle: envioSeleccionado.calle,
            numero: envioSeleccionado.numero,
            piso: envioSeleccionado.piso,
          }
        : undefined
    )

    if (result.ok && result.init_point) {
      window.location.href = result.init_point
    } else {
      setErrorPago(result.error ?? 'Error inesperado. Intentá de nuevo.')
      setPagando(false)
    }
  }

  function handlePagarGuest() {
    const nombre = guestNombre.trim()
    const email  = guestEmail.trim()

    if (!nombre) { setGuestErrors('Ingresá tu nombre.'); return }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setGuestErrors('Ingresá un email válido.')
      return
    }

    handlePagarMP({ nombre, email, telefono: guestTelefono.trim() || undefined })
  }

  if (!mounted) return null

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 pt-24">
        <ShoppingBag size={56} strokeWidth={1} style={{ color: 'var(--color-acero-claro)' }} />
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
  const totalConEnvio = totalGeneral + (envioSeleccionado?.costo ?? 0)

  // Ajuste por método de pago (mayoristas, solo UI)
  const canalHabilitaFinanciado = esMayorista && reglas
    ? (reglas.pagos_habilitados ?? {})['cheque_fisico_financiado']?.activo
    : false
  const metodosDisponibles = esMayorista && reglas
    ? METODOS_CONTADO.filter(k => {
        if (k === 'cheque_fisico_financiado') return canalHabilitaFinanciado && reglas.credito_aprobado
        return (reglas.pagos_habilitados ?? {})[k]?.activo
      })
    : []
  const ajuste = metodoPago && reglas
    ? metodoPago === 'efectivo'
      ? -Math.round(totalGeneral * (reglas.desc_efectivo_pct ?? 0) / 100)
      : metodoPago === 'transferencia_negro'
        ? -Math.round(totalGeneral * (reglas.desc_transferencia_pct ?? 0) / 100)
        : metodoPago === 'transferencia_blanco'
          ? Math.round(totalGeneral * (reglas.recargo_transf_blanco_pct ?? 21) / 100)
          : 0
    : 0

  // Descuento de autogestión web (primera vs siguientes compras, solo mayoristas)
  const descAutogestPct = esMayorista && reglas
    ? (reglas.es_primera_compra
        ? (reglas.desc_autogestion_primera_pct ?? 0)
        : (reglas.desc_autogestion_siguientes_pct ?? 0))
    : 0
  const ajusteAutogestion = descAutogestPct > 0 ? -Math.round(totalGeneral * descAutogestPct / 100) : 0

  const totalFinal = totalGeneral + ajuste + ajusteAutogestion + (envioSeleccionado?.costo ?? 0)
  const minimoInsuficiente = Boolean(reglas?.minimo_compra && totalGeneral < reglas.minimo_compra)
  const totalUnidades = items.reduce((a, i) => a + i.cantidad, 0)

  // Stock: null = sin control, number = límite conocido
  function stockDisponible(productoId: number): number | null {
    return productoId in stocks ? stocks[productoId] : null
  }
  function exceedeStock(productoId: number, cantidad: number): boolean {
    const s = stockDisponible(productoId)
    return s !== null && cantidad > s
  }
  const hayProblemaStock = items.some(i => exceedeStock(i.productoId, i.cantidad))

  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border outline-none'
  const inputStyle: React.CSSProperties = {
    borderColor: 'var(--color-acero-claro)',
    color: 'var(--foreground)',
    background: 'white',
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 md:px-10 max-w-5xl mx-auto">
      {guestItemsMerged && user && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: 'var(--color-acero-brillo)', color: 'var(--color-acero-oscuro)', border: '1px solid var(--color-acero-claro)' }}>
          Mantuvimos los productos que habías agregado antes de iniciar sesión.
        </div>
      )}
      {preciosCambiaron && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>
          Los precios de tu carrito se actualizaron. Revisá el total antes de continuar.
        </div>
      )}
      {refreshFallo && !preciosCambiaron && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa' }}>
          No pudimos verificar los precios actuales. Los montos podrían no estar al día.
        </div>
      )}
      <div className="flex items-start justify-between mb-2">
        <h1 className="text-2xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
          Mi carrito
        </h1>
        {confirmVaciar ? (
          <div className="flex items-center gap-3 text-sm">
            <span style={{ color: 'var(--color-acero-oscuro)' }}>¿Vaciar todo?</span>
            <button
              onClick={() => { clear(); setConfirmVaciar(false) }}
              className="font-medium"
              style={{ color: '#ef4444' }}
            >
              Confirmar
            </button>
            <button
              onClick={() => setConfirmVaciar(false)}
              style={{ color: 'var(--color-acero-oscuro)' }}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmVaciar(true)}
            className="flex items-center gap-1.5 text-sm transition-colors hover:opacity-70"
            style={{ color: 'var(--color-acero-oscuro)' }}
          >
            <Trash2 size={13} />
            Vaciar carrito
          </button>
        )}
      </div>
      <p className="text-sm mb-8" style={{ color: 'var(--color-acero-oscuro)' }}>
        {items.length} {items.length === 1 ? 'producto' : 'productos'} · {totalUnidades} {totalUnidades === 1 ? 'unidad' : 'unidades'}
      </p>

      <div className="flex flex-col lg:flex-row gap-10 items-start">

        {/* Lista de ítems */}
        <div className="flex-1 w-full">
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--color-acero-claro)', background: 'white' }}
          >
            {items.map((item, idx) => {
              const multiplo = item.multiplo ?? 1
              const subtotal = item.precio * item.cantidad
              const esUltimo = idx === items.length - 1
              const stockItem = stockDisponible(item.productoId)
              const masAllaDelStock = exceedeStock(item.productoId, item.cantidad)
              const plusDeshabilitado = stockItem !== null && item.cantidad + multiplo > stockItem
              const itemKey = item.itemKey ?? `${item.productoId}:`
              return (
                <div
                  key={itemKey}
                  className="flex gap-4 p-5"
                  style={!esUltimo ? { borderBottom: '1px solid var(--color-acero-claro)' } : undefined}
                >
                  {/* Foto */}
                  <div
                    className="w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden"
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
                        <ShoppingBag size={24} style={{ color: 'var(--color-acero-oscuro)' }} />
                      </div>
                    )}
                  </div>

                  {/* Info + controles */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
                    <div>
                      <Link
                        href={`/tienda/p/${item.productoId}`}
                        className="text-base font-medium leading-snug hover:underline"
                        style={{ color: 'var(--foreground)' }}
                      >
                        {item.titulo}
                      </Link>
                      <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--color-acero-oscuro)' }}>
                        {item.codigo_interno}
                      </p>
                      {item.variante && (
                        <div className="mt-1">
                          <VarianteBadge variante={item.variante} />
                        </div>
                      )}
                      {mostrarPrecios && item.precio > 0 && (
                        <p className="text-sm mt-1" style={{ color: 'var(--color-acero-oscuro)' }}>
                          {formatPrecio(item.precio)} c/u{esMayorista ? ' s/ IVA' : ''}
                        </p>
                      )}
                    </div>

                    {/* Stepper + Eliminar */}
                    <div className="flex items-center gap-4 flex-wrap">
                      <QuantityStepper
                        value={item.cantidad}
                        multiplo={multiplo}
                        max={stocks[item.productoId]}
                        plusDisabled={plusDeshabilitado}
                        onCommit={n => updateCantidad(itemKey, n)}
                        onRemove={() => remove(itemKey)}
                      />

                      {multiplo > 1 && (
                        <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                          múltiplo de {multiplo}
                        </span>
                      )}

                      <button
                        onClick={() => remove(itemKey)}
                        className="text-sm transition-colors hover:underline"
                        style={{ color: '#ef4444' }}
                      >
                        Eliminar
                      </button>
                    </div>

                    {masAllaDelStock && (
                      <p className="text-xs mt-1" style={{ color: '#f59e0b' }}>
                        Ingresa próximamente — reducí la cantidad para continuar.
                      </p>
                    )}
                  </div>

                  {/* Subtotal */}
                  <div className="flex-shrink-0 flex flex-col items-end justify-between">
                    {mostrarPrecios && item.precio > 0 && (
                      <p className="text-base font-semibold tabular-nums" style={{ color: 'var(--foreground)' }}>
                        {formatPrecio(subtotal)}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={() => router.push('/tienda')}
            className="text-sm tracking-wide mt-4 self-start"
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
          <p className="text-base font-medium" style={{ color: 'var(--foreground)' }}>Resumen del pedido</p>

          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between" style={{ color: 'var(--color-acero-oscuro)' }}>
              <span>Productos ({items.length})</span>
              <span>{totalUnidades} {totalUnidades === 1 ? 'unidad' : 'unidades'}</span>
            </div>

            {mostrarPrecios && totalGeneral > 0 && (
              <>
                <div className="flex justify-between" style={{ color: 'var(--color-acero-oscuro)' }}>
                  <span>Subtotal</span>
                  <span>{formatPrecio(totalGeneral)}</span>
                </div>
                {envioSeleccionado && (
                  <div className="flex justify-between" style={{ color: 'var(--color-acero-oscuro)' }}>
                    <span>Envío</span>
                    <span>{formatPrecio(envioSeleccionado.costo)}</span>
                  </div>
                )}
                {ajuste !== 0 && (
                  <div className="flex justify-between text-xs font-medium" style={{ color: ajuste < 0 ? '#16a34a' : '#dc2626' }}>
                    <span>{ajuste < 0 ? 'Descuento' : 'Recargo'} ({METODO_LABEL[metodoPago!] ?? metodoPago})</span>
                    <span>{ajuste < 0 ? '-' : '+'}{formatPrecio(Math.abs(ajuste))}</span>
                  </div>
                )}
                {ajusteAutogestion !== 0 && (
                  <div className="flex justify-between text-xs font-medium" style={{ color: '#16a34a' }}>
                    <span>Desc. web ({reglas?.es_primera_compra ? '1ª compra' : 'cliente recurrente'})</span>
                    <span>-{formatPrecio(Math.abs(ajusteAutogestion))}</span>
                  </div>
                )}
                <div className="h-px my-1" style={{ background: 'var(--color-acero-claro)' }} />
                <div className="flex justify-between font-semibold text-lg" style={{ color: 'var(--foreground)' }}>
                  <span>Total{esMayorista ? ' s/ IVA' : ''}</span>
                  <span>{formatPrecio(esMayorista ? totalFinal : totalConEnvio)}</span>
                </div>
                {!esMayorista && (
                  <p className="text-xs leading-snug" style={{ color: 'var(--color-acero-oscuro)' }}>
                    Precio de contado. Si pagás en cuotas con tarjeta, Mercado Pago aplica el interés de tu banco.
                  </p>
                )}
              </>
            )}
          </div>

          <div className="h-px" style={{ background: 'var(--color-acero-claro)' }} />

          {/* Cotizador de envío — obligatorio para minoristas y guests */}
          {(esMinorista || esGuest) && (
            <EnvioCotizador
              items={items.map(i => ({ productoId: i.productoId, cantidad: i.cantidad }))}
              seleccionada={envioSeleccionado}
              onSelect={handleEnvioSelect}
              envioFlexActivo={reglas?.envio_flex_activo ?? true}
              defaultOpen
            />
          )}

          {/* CTA según rol */}
          {esMinorista ? (
            <>
              {!envioSeleccionado && (
                <p className="text-xs text-center" style={{ color: 'var(--color-acero-oscuro)' }}>
                  Calculá el envío para continuar.
                </p>
              )}
              <button
                onClick={() => handlePagarMP()}
                disabled={pagando || hayProblemaStock || refreshingPrecios || !envioSeleccionado}
                className="w-full py-3 rounded-lg text-base font-medium flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                style={{ background: '#009ee3', color: 'white' }}
              >
                {pagando ? (
                  <><Loader2 size={15} className="animate-spin" /> Redirigiendo…</>
                ) : refreshingPrecios ? (
                  <><Loader2 size={15} className="animate-spin" /> Verificando precios…</>
                ) : (
                  'Pagar con Mercado Pago'
                )}
              </button>
              {errorPago && (
                <p className="text-xs text-center" style={{ color: '#ef4444' }}>{errorPago}</p>
              )}
            </>
          ) : esMayorista ? (
            <div className="flex flex-col gap-3">

              {/* Selector de dirección de entrega */}
              {direcciones.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>
                      Dirección de entrega
                    </p>
                    <a href="/cuenta/direcciones" className="text-xs underline"
                      style={{ color: 'var(--color-acero-oscuro)' }}>
                      Gestionar
                    </a>
                  </div>
                  <select
                    value={direccionId ?? ''}
                    onChange={e => setDireccionId(e.target.value || null)}
                    className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                    style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)', background: 'white' }}
                  >
                    <option value="">Sin especificar</option>
                    {direcciones.map(d => {
                      const label = [d.alias, d.calle, d.numero, d.localidad].filter(Boolean).join(', ')
                      return <option key={d.id} value={d.id}>{label}</option>
                    })}
                  </select>
                </div>
              )}

              {direcciones.length === 0 && (
                <a href="/cuenta/direcciones"
                  className="text-xs py-2 px-3 rounded-lg border border-dashed text-center transition-colors"
                  style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}>
                  + Agregar dirección de entrega
                </a>
              )}

              {/* Selector de método de pago */}
              {metodosDisponibles.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-acero-oscuro)' }}>
                    Forma de pago
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {metodosDisponibles.map(k => (
                      <label
                        key={k}
                        className="flex items-center gap-2.5 cursor-pointer px-3 py-2 rounded-lg border transition-colors"
                        style={{
                          borderColor: metodoPago === k ? 'var(--color-granito-oscuro)' : 'var(--color-acero-claro)',
                          background:  metodoPago === k ? 'var(--color-acero-brillo)' : 'white',
                        }}
                      >
                        <input
                          type="radio"
                          name="metodo_pago"
                          value={k}
                          checked={metodoPago === k}
                          onChange={() => setMetodoPago(k)}
                          className="flex-shrink-0"
                        />
                        <span className="text-sm flex-1" style={{ color: 'var(--foreground)' }}>
                          {METODO_LABEL[k] ?? k}
                        </span>
                        {k === 'efectivo' && reglas && reglas.desc_efectivo_pct > 0 && (
                          <span className="text-xs font-medium" style={{ color: '#16a34a' }}>
                            -{reglas.desc_efectivo_pct}%
                          </span>
                        )}
                        {k === 'transferencia_negro' && reglas && reglas.desc_transferencia_pct > 0 && (
                          <span className="text-xs font-medium" style={{ color: '#16a34a' }}>
                            -{reglas.desc_transferencia_pct}%
                          </span>
                        )}
                        {k === 'transferencia_blanco' && reglas && reglas.recargo_transf_blanco_pct > 0 && (
                          <span className="text-xs font-medium" style={{ color: '#dc2626' }}>
                            +{reglas.recargo_transf_blanco_pct}%
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Aviso línea de crédito — canal habilita financiado pero usuario no tiene crédito aprobado */}
              {canalHabilitaFinanciado && reglas && !reglas.credito_aprobado && (
                <div className="px-3 py-2.5 rounded-lg text-xs flex flex-col gap-1" style={{ background: '#fef9c3', border: '1px solid #fde68a' }}>
                  <p className="font-medium" style={{ color: '#854d0e' }}>Cheque financiado disponible con línea de crédito</p>
                  <p style={{ color: '#92400e' }}>
                    Tu canal permite operar con cheques a plazo, pero necesitás una{' '}
                    <a href="/cuenta/financiacion" className="underline font-medium">línea de crédito aprobada</a>.
                    Podés solicitarla ahora — Gastón la evalúa en 48–72 hs hábiles.
                  </p>
                </div>
              )}

              {/* Dirección de retiro — si el canal tiene activo mostrar_direccion_en_web */}
              {reglas?.mostrar_direccion_en_web && reglas?.direccion_negocio && (
                <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--color-acero-brillo)', border: '1px solid var(--color-acero-claro)' }}>
                  <p className="font-medium mb-0.5" style={{ color: 'var(--foreground)' }}>Dirección de retiro</p>
                  <p style={{ color: 'var(--color-acero-oscuro)' }}>{reglas.direccion_negocio}</p>
                </div>
              )}

              {/* Aviso mínimo de compra */}
              {minimoInsuficiente && reglas?.minimo_compra && (
                <div className="px-3 py-2 rounded-lg text-xs" style={{ background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa' }}>
                  Mínimo de compra: {formatPrecio(reglas.minimo_compra)}.{' '}
                  Te faltan {formatPrecio(reglas.minimo_compra - totalGeneral)}.
                </div>
              )}

              {/* Botón WhatsApp */}
              <a
                href={`https://wa.me/${WA_NUMBER}?text=${buildWhatsAppMsg(items, metodoPago, mostrarPrecios && totalFinal > 0 ? totalFinal : undefined, direccionId ? direcciones.find(d => d.id === direccionId) : null, reglas?.whatsapp_tipo ?? 'bot')}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={minimoInsuficiente || hayProblemaStock}
                className="w-full py-3 rounded-lg text-base font-medium text-center flex items-center justify-center gap-2 transition-opacity"
                style={{
                  background: '#25D366',
                  color: 'white',
                  opacity: minimoInsuficiente || hayProblemaStock ? 0.4 : 1,
                  pointerEvents: minimoInsuficiente || hayProblemaStock ? 'none' : 'auto',
                }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Pedir por WhatsApp
              </a>
            </div>
          ) : esGuest ? (
            // ── Comprador sin cuenta ────────────────────────────────────
            <>
              {!envioSeleccionado && (
                <p className="text-xs text-center" style={{ color: 'var(--color-acero-oscuro)' }}>
                  Calculá el envío para continuar.
                </p>
              )}
              <button
                onClick={() => setGuestModalOpen(true)}
                disabled={pagando || hayProblemaStock || refreshingPrecios || !envioSeleccionado}
                className="w-full py-3 rounded-lg text-base font-medium flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                style={{ background: '#009ee3', color: 'white' }}
              >
                {pagando ? (
                  <><Loader2 size={15} className="animate-spin" /> Redirigiendo…</>
                ) : refreshingPrecios ? (
                  <><Loader2 size={15} className="animate-spin" /> Verificando precios…</>
                ) : (
                  'Pagar con Mercado Pago'
                )}
              </button>

              {errorPago && (
                <p className="text-xs text-center" style={{ color: '#ef4444' }}>{errorPago}</p>
              )}

              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-px" style={{ background: 'var(--color-acero-claro)' }} />
                <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>o</span>
                <div className="flex-1 h-px" style={{ background: 'var(--color-acero-claro)' }} />
              </div>
              <Link
                href="/login?next=/carrito"
                className="w-full py-2.5 rounded-lg text-sm text-center border transition-opacity"
                style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}
              >
                Iniciar sesión
              </Link>
            </>
          ) : (
            <p className="text-xs text-center" style={{ color: 'var(--color-acero-oscuro)' }}>
              Contactanos para completar tu pedido.
            </p>
          )}
        </div>
      </div>

      {/* Modal datos de compra sin cuenta */}
      {guestModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={e => { if (e.target === e.currentTarget) setGuestModalOpen(false) }}
        >
          <div
            className="w-full max-w-sm rounded-xl p-6 flex flex-col gap-4"
            style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Tus datos para el pedido
              </p>
              <button
                onClick={() => setGuestModalOpen(false)}
                aria-label="Cerrar"
                className="w-7 h-7 flex items-center justify-center rounded-full"
                style={{ background: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
              >
                ×
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Nombre y apellido *"
                value={guestNombre}
                onChange={e => { setGuestNombre(e.target.value); setGuestErrors(null) }}
                className={inputClass}
                style={inputStyle}
                autoFocus
              />
              <input
                type="email"
                placeholder="Email *"
                value={guestEmail}
                onChange={e => { setGuestEmail(e.target.value); setGuestErrors(null) }}
                className={inputClass}
                style={inputStyle}
              />
              <input
                type="tel"
                placeholder="Teléfono (opcional)"
                value={guestTelefono}
                onChange={e => setGuestTelefono(e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </div>

            {guestErrors && (
              <p className="text-xs" style={{ color: '#ef4444' }}>{guestErrors}</p>
            )}

            <button
              onClick={handlePagarGuest}
              disabled={pagando}
              className="w-full py-3 rounded-lg text-base font-medium flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
              style={{ background: '#009ee3', color: 'white' }}
            >
              {pagando ? (
                <><Loader2 size={15} className="animate-spin" /> Redirigiendo…</>
              ) : (
                'Confirmar y pagar'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Banner medios de pago — ancho completo, solo minoristas y guests */}
      {!esMayorista && (
        <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--color-acero-claro)' }}>
          <p className="text-xs mb-3" style={{ color: 'var(--color-acero-oscuro)' }}>Medios de pago aceptados</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mediosdepago.png"
            alt="Medios de pago: Visa, Mastercard, Naranja, Cabal, Mercado Pago y más"
            style={{ width: '100%', height: 'auto' }}
          />
        </div>
      )}
    </div>
  )
}
