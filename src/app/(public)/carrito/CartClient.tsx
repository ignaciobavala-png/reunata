'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ShoppingBag, Loader2, Trash2, Upload, Check, Copy } from 'lucide-react'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { useCartStore } from '@/stores/cartStore'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { iniciarCheckoutMP, iniciarCheckoutTransferencia } from '@/app/actions/checkout'
import { crearPedidoBorrador } from '@/app/actions/pedidos'
import { formatPrecio } from '@/lib/utils'
import { EnvioCotizador, type EnvioSeleccionado } from '@/components/cliente/EnvioCotizador'
import { VarianteBadge } from '@/components/sections/ColorPicker'
import { METODOS_CON_IVA, METODOS_SIN_IVA, METODO_LABEL, metodoLabelCorto } from '@/lib/metodos-pago'
import { resolverTramoVolumen, tramosPendientes } from '@/lib/descuento-volumen'

const WA_NUMBER = '5491132720974'

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

// Dato bancario con botón de copia individual (Alias y CBU por separado, pedido del tester 2026-07).
// Vive dentro del <label> del radio de forma de pago: hay que frenar la propagación
// para que el click en copiar no re-active el label.
function DatoCopiable({ label, value }: { label: string; value: string }) {
  const [copiado, setCopiado] = useState(false)
  function copiar(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(value)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1500)
  }
  return (
    <span className="flex items-center gap-1.5 w-full min-w-0 text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
      <span className="flex-shrink-0">{label}:</span>
      <span className="font-mono break-all min-w-0" style={{ color: 'var(--foreground)' }}>{value}</span>
      <button
        type="button"
        onClick={copiar}
        aria-label={`Copiar ${label}`}
        className="p-1 rounded flex-shrink-0 transition-colors duration-150"
        style={{ color: copiado ? '#10b981' : 'var(--color-acero)' }}
      >
        {copiado ? <Check size={12} /> : <Copy size={12} />}
      </button>
    </span>
  )
}

interface ReglaCanal {
  pagos_habilitados:               Record<string, { activo: boolean }>
  minimo_compra:                   number | null
  desc_efectivo_pct:               number
  recargo_transf_blanco_pct:       number
  recargo_echeq_al_dia_pct:        number
  recargo_cheque_al_dia_pct:       number
  recargo_echeq_propio_pct:        number
  desc_transferencia_pct:          number
  desc_autogestion_primera_pct:    number
  desc_autogestion_siguientes_pct: number
  desc_volumen_monto_min:          number | null
  desc_volumen_pct:                number | null
  desc_volumen_monto_min_2:        number | null
  desc_volumen_pct_2:              number | null
  desc_volumen_monto_min_3:        number | null
  desc_volumen_pct_3:              number | null
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
  categoriaComercial: string | null
  telefono: string | null
}

interface Props {
  user: PageUser | null
  mostrarPrecios: boolean
  cbuSinIva?: string
  aliasSinIva?: string
  tipoCuentaSinIva?: 'CBU' | 'CVU' | 'deposito'
  cuitSinIva?: string
  bancoSinIva?: string
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

function UploaderComprobante({
  path,
  uploading,
  error,
  onFile,
  onClear,
}: {
  path: string | null
  uploading: boolean
  error: string | null
  onFile: (f: File) => void
  onClear: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  if (path) {
    return (
      <div className="rounded-lg border px-3 py-2.5 flex items-center gap-2.5"
        style={{ background: '#10b98115', borderColor: '#10b98144' }}>
        <Check size={14} style={{ color: '#10b981', flexShrink: 0 }} />
        <span className="text-sm flex-1" style={{ color: '#10b981' }}>Comprobante adjunto</span>
        <button type="button" onClick={onClear}
          className="text-xs underline" style={{ color: '#059669' }}>
          Cambiar
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-lg border px-3 py-2.5 flex flex-col gap-1.5"
      style={{ borderColor: 'var(--color-acero-claro)', background: 'var(--color-acero-brillo)' }}>
      <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
        Adjuntar comprobante <span className="font-normal" style={{ color: 'var(--color-acero-oscuro)' }}>(opcional, agiliza la confirmación)</span>
      </p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="self-start flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors disabled:opacity-60"
        style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)', background: 'white' }}
      >
        {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
        {uploading ? 'Subiendo…' : 'Seleccionar archivo'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={e => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
    </div>
  )
}

export function CartClient({ user, mostrarPrecios, cbuSinIva, aliasSinIva, tipoCuentaSinIva = 'CBU', cuitSinIva, bancoSinIva }: Props) {
  const { items, remove, updateCantidad, updatePrecios, updateStocks, clear, total, guestItemsMerged, clearGuestMergedFlag, editingPedidoId, editingPedidoNumero } = useCartStore()
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
  const [stocks, setStocks] = useState<Record<string, number | null>>({})
  const [ivaRates, setIvaRates] = useState<Record<number, number>>({})
  const [reglas, setReglas] = useState<ReglaCanal | null>(null)
  const [metodoPago, setMetodoPago] = useState<string | null>(null)
  const [facturaIva, setFacturaIva] = useState<'con' | 'sin' | null>(null)
  // Método de pago para consumidor_final ('mercado_pago' | 'transferencia')
  const [metodoPagoMinorista, setMetodoPagoMinorista] = useState<string | null>(null)
  const [direcciones, setDirecciones] = useState<DireccionEntrega[]>([])
  const [direccionId, setDireccionId] = useState<string | null>(null)

  // WhatsApp de contacto del minorista logueado — precargado del perfil, editable y obligatorio.
  // Sin un WhatsApp no podríamos avisarle si un producto de su pedido queda sin stock.
  const [telefonoMinorista, setTelefonoMinorista] = useState(user?.telefono ?? '')
  const telefonoMinoristaValido = telefonoMinorista.replace(/\D/g, '').length >= 8

  // Uploader de comprobante en carrito
  const [comprobantePath, setComprobantePath] = useState<string | null>(null)
  const [uploadingComp, setUploadingComp]     = useState(false)
  const [compError, setCompError]             = useState<string | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createBrowserClient> | null>(null)
  function getSupabaseClient() {
    if (!supabaseRef.current) supabaseRef.current = createBrowserClient()
    return supabaseRef.current
  }

  async function handleUploadComprobante(file: File) {
    setUploadingComp(true)
    setCompError(null)
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `pre/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await getSupabaseClient().storage.from('comprobantes').upload(path, file, { upsert: false })
    if (error) {
      setCompError('Error al subir el archivo. Intentá de nuevo.')
      setUploadingComp(false)
      return
    }
    setComprobantePath(path)
    setUploadingComp(false)
  }

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
      body: JSON.stringify({ items: items.map(i => ({ productoId: i.productoId, variante: i.variante ?? null })) }),
    })
      .then(r => r.json())
      .then(({ precios, stocks: st, ivaRates: ir }) => {
        if (precios) {
          const cambiaron = ids.some(
            id => precios[id] !== undefined && precios[id] !== preciosSnapshot[id]
          )
          updatePrecios(precios)
          if (cambiaron) setPreciosCambiaron(true)
        }
        if (st) {
          setStocks(st)
          updateStocks(st)
        }
        if (ir) setIvaRates(ir)
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

  // Cargar reglas del canal — también para guests (resuelven a consumidor_final):
  // el server les aplica mínimo de compra y envío gratis, así que deben verlos acá.
  useEffect(() => {
    if (!mounted) return
    fetch('/api/carrito/reglas')
      .then(r => r.json())
      .then(({ reglas: r }) => { if (r) setReglas(r) })
      .catch(() => {})
  }, [mounted, user])

  const esMinorista = user?.categoriaComercial === 'minorista'
  const esMayorista = user?.categoriaComercial === 'mayorista' || user?.categoriaComercial === 'especial'
  const esGuest     = !user

  // Cargar direcciones — solo mayoristas
  useEffect(() => {
    if (!mounted || !esMayorista) return
    fetch('/api/cuenta/direcciones')
      .then(r => r.json())
      .then(({ direcciones: d }: { direcciones: DireccionEntrega[] }) => {
        setDirecciones(d)
        const predeterminada = d.find(x => x.predeterminada)
        if (predeterminada) setDireccionId(predeterminada.id)
      })
      .catch(() => {})
  }, [mounted, esMayorista])

  // Auto-seleccionar método de pago para consumidor_final (minorista o invitado)
  useEffect(() => {
    if (!reglas || !(esMinorista || esGuest)) return
    const mp    = reglas.pagos_habilitados?.['mercado_pago']?.activo ?? false
    const transf = reglas.pagos_habilitados?.['transferencia']?.activo ?? false
    if (mp) setMetodoPagoMinorista('mercado_pago')
    else if (transf) setMetodoPagoMinorista('transferencia')
  }, [reglas, esMinorista, esGuest])

  // Se guarda la cotización original; el envío gratis se recalcula en cada render
  // sobre el total vigente — congelarlo acá desincronizaba lo mostrado de lo cobrado
  // cuando el usuario cambiaba cantidades después de cotizar.
  function handleEnvioSelect(opcion: EnvioSeleccionado | null) {
    setEnvioSeleccionado(opcion)
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
        : undefined,
      esMinorista ? telefonoMinorista.trim() : undefined,
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

    const telefono = guestTelefono.trim()

    if (!nombre) { setGuestErrors('Ingresá tu nombre.'); return }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setGuestErrors('Ingresá un email válido.')
      return
    }
    if (telefono.replace(/\D/g, '').length < 8) {
      setGuestErrors('Ingresá tu WhatsApp — lo necesitamos para avisarte si hay algún tema con el stock.')
      return
    }

    if (metodoPagoMinorista === 'transferencia') {
      handlePagarTransferenciaGuest({ nombre, email, telefono })
    } else {
      handlePagarMP({ nombre, email, telefono })
    }
  }

  async function handlePagarTransferenciaGuest(guestData: { nombre: string; email: string; telefono: string }) {
    if (!items.length || pagando) return
    if (!comprobantePath) { setGuestErrors('Adjuntá el comprobante de la transferencia.'); return }
    setPagando(true)
    setErrorPago(null)

    const result = await iniciarCheckoutTransferencia(
      items.map(i => ({ productoId: i.productoId, cantidad: i.cantidad, variante: i.variante })),
      envioSeleccionado
        ? {
            provincia: envioSeleccionado.provincia,
            codigo_postal: envioSeleccionado.codigo_postal,
            servicioId: envioSeleccionado.servicioId,
            calle: envioSeleccionado.calle,
            numero: envioSeleccionado.numero,
            piso: envioSeleccionado.piso,
          }
        : undefined,
      comprobantePath,
      undefined,
      guestData,
    )

    if (result.ok) {
      clear()
      router.push(`/checkout/transferencia-recibida${result.numero ? `?numero=${result.numero}` : ''}`)
    } else {
      setGuestErrors(result.error ?? 'Error inesperado. Intentá de nuevo.')
      setPagando(false)
    }
  }

  async function handlePagarTransferencia() {
    if (!items.length || pagando) return
    setPagando(true)
    setErrorPago(null)

    const result = await iniciarCheckoutTransferencia(
      items.map(i => ({ productoId: i.productoId, cantidad: i.cantidad, variante: i.variante })),
      envioSeleccionado
        ? {
            provincia: envioSeleccionado.provincia,
            codigo_postal: envioSeleccionado.codigo_postal,
            servicioId: envioSeleccionado.servicioId,
            calle: envioSeleccionado.calle,
            numero: envioSeleccionado.numero,
            piso: envioSeleccionado.piso,
          }
        : undefined,
      comprobantePath ?? undefined,
      telefonoMinorista.trim() || undefined,
    )

    if (result.ok && result.pedidoId) {
      clear()
      router.push(`/pedidos/${result.pedidoId}`)
    } else {
      setErrorPago(result.error ?? 'Error inesperado. Intentá de nuevo.')
      setPagando(false)
    }
  }

  async function handleConfirmarPedidoMayorista() {
    if (!items.length || pagando) return
    if (!metodoPago || !facturaIva) { setErrorPago('Seleccioná tipo de facturación y forma de pago.'); return }
    setPagando(true)
    setErrorPago(null)
    const result = await crearPedidoBorrador(
      items.map(i => ({ productoId: i.productoId, cantidad: i.cantidad, variante: i.variante })),
      { medioPago: metodoPago, facturaIva: facturaIva === 'con', comprobantePath: comprobantePath ?? undefined, pedidoIdToEdit: editingPedidoId ?? undefined },
    )
    if (result.ok && result.pedidoId) {
      clear()
      router.push(`/pedidos/${result.pedidoId}`)
    } else {
      setErrorPago(result.error ?? 'Error al confirmar el pedido. Intentá de nuevo.')
      setPagando(false)
    }
  }

  if (!mounted) return null

  if (items.length === 0) {
    // Tras confirmar un pedido, clear() vacía el carrito antes de que cargue /pedidos/[id];
    // sin este estado intermedio, el fallback de "carrito vacío" flashea durante la navegación.
    if (pagando) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 pt-24">
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-acero-oscuro)' }} />
          <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
            Confirmando tu pedido…
          </p>
        </div>
      )
    }
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

  // Desglose IVA — para minoristas y guests el precio del carrito ya incluye IVA;
  // para mayoristas el precio es neto, así que el Precio Bruto ES el total
  const totalSinIVA = (!esMayorista)
    ? items.reduce((acc, i) => {
        const rate = ivaRates[i.productoId] ?? 0.21
        return acc + Math.round(i.precio / (1 + rate)) * i.cantidad
      }, 0)
    : totalGeneral

  // ── Cascada de descuentos (orden del tester): 1) WEB, 2) Volumen, 3) forma de pago ──
  // El total final no depende del orden (dos descuentos multiplicativos dan lo mismo),
  // pero se calcula WEB sobre el bruto para que ese descuento se muestre en su valor
  // más alto (antes se achicaba por calcularse sobre el precio ya descontado por volumen).
  // El path minorista no tiene desc. web (descAutogestPct = 0), así que no se ve afectado.

  // 1) Descuento web (autogestión, solo mayoristas) — sobre el bruto (totalGeneral)
  const descAutogestPct = esMayorista && reglas
    ? (reglas.es_primera_compra
        ? (reglas.desc_autogestion_primera_pct ?? 0)
        : (reglas.desc_autogestion_siguientes_pct ?? 0))
    : 0
  const ajusteAutogestion = descAutogestPct > 0 ? -Math.round(totalGeneral * descAutogestPct / 100) : 0
  const basePostWeb = totalGeneral + ajusteAutogestion

  // 2) Descuento por volumen — umbral evaluado sobre el bruto (calificás por lo que
  // comprás), % aplicado sobre la base ya descontada por web. Mismo criterio que el server.
  const tramoVolumen = resolverTramoVolumen(reglas, totalGeneral)
  const descVolCanalPct = tramoVolumen?.pct ?? 0
  const ajusteVolumenCanal = tramoVolumen
    ? -Math.round(basePostWeb * tramoVolumen.pct / 100)
    : 0
  // Base final tras web + volumen, sobre la que se aplica la forma de pago (paso 3).
  const basePostDescuentos = basePostWeb + ajusteVolumenCanal

  // Tramos que todavía no se alcanzaron, para el aviso progresivo: sin superar
  // ninguno se muestran los 3; superado el 1º se muestran el 2º y 3º, etc.
  const tramosVolPendientes = tramosPendientes(reglas, totalGeneral)
  const avisoDescVolumen = tramosVolPendientes.length > 0 && (
    <div className="px-3 py-2 rounded-lg text-xs space-y-0.5" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
      {tramosVolPendientes.map(t => (
        <p key={t.montoMin}>
          Te faltan {formatPrecio(t.montoMin - totalGeneral)} para el {t.pct}% de descuento por volumen.
        </p>
      ))}
    </div>
  )

  // Métodos disponibles para consumidor_final (leídos de reglas del canal).
  // Aplica tanto a minoristas logueados como a invitados (ambos resuelven a
  // consumidor_final y comparten la config de pagos del canal).
  const esConsumidorFinal = esMinorista || esGuest
  const mpActivo          = esConsumidorFinal ? (reglas?.pagos_habilitados?.['mercado_pago']?.activo  ?? false) : false
  const transferenciaActiva = esConsumidorFinal ? (reglas?.pagos_habilitados?.['transferencia']?.activo ?? false) : false
  const ambosPagosMinorista = mpActivo && transferenciaActiva

  // Métodos de pago mayorista agrupados por IVA
  const canalHabilitaFinanciado = esMayorista && reglas
    ? (reglas.pagos_habilitados ?? {})['cheque_fisico_financiado']?.activo
    : false
  const metodosConIva = esMayorista && reglas
    ? METODOS_CON_IVA.filter(k => (reglas.pagos_habilitados ?? {})[k]?.activo)
    : []
  const metodosSinIva = esMayorista && reglas
    ? METODOS_SIN_IVA.filter(k => (reglas.pagos_habilitados ?? {})[k]?.activo)
    : []

  // Recargo IVA (Factura A) por método — los pagos "con IVA" suman este % al total.
  // transferencia_blanco default 21 por retrocompat; el resto arranca en 0 hasta
  // que el canal lo configure.
  const recargoConIvaPct: Record<string, number> = {
    transferencia_blanco: reglas?.recargo_transf_blanco_pct ?? 21,
    echeq_al_dia:         reglas?.recargo_echeq_al_dia_pct ?? 0,
    cheque_fisico_al_dia: reglas?.recargo_cheque_al_dia_pct ?? 0,
    echeq_propio:         reglas?.recargo_echeq_propio_pct ?? 0,
  }

  // Descuento/recargo por método de pago — se aplica sobre el precio ya descontado por web
  const ajustePct = metodoPago && reglas
    ? metodoPago === 'efectivo'
      ? (reglas.desc_efectivo_pct ?? 0)
      : metodoPago === 'transferencia_negro'
        ? (reglas.desc_transferencia_pct ?? 0)
        : (recargoConIvaPct[metodoPago] ?? 0)
    : 0
  const ajuste = metodoPago && reglas
    ? (metodoPago === 'efectivo' || metodoPago === 'transferencia_negro')
      ? -Math.round(basePostDescuentos * ajustePct / 100)
      : metodoPago in recargoConIvaPct
        ? Math.round(basePostDescuentos * ajustePct / 100)
        : 0
    : 0

  // ── Presentación mayorista en bruto (sin IVA) ─────────────────────────
  // El resumen se muestra en valores netos; el IVA solo aparece en "Total IVA
  // incluido". Los montos cobrados no cambian (misma cascada de siempre).
  const totalConIvaMayorista = esMayorista
    ? items.reduce((acc, i) => acc + Math.round(i.precio * (1 + (ivaRates[i.productoId] ?? 0.21))) * i.cantidad, 0)
    : 0
  const totalBrutoMayorista = basePostDescuentos
  // IVA proporcional a la mezcla real de alícuotas del carrito (×1.21 si todo es 21%)
  const totalIvaIncluidoMayorista = totalGeneral > 0
    ? Math.round(basePostDescuentos * (totalConIvaMayorista / totalGeneral))
    : 0

  // Total final si el mayorista eligiera ese método — se muestra en $ dentro de cada botón
  function totalMayoristaConMetodo(k: string): number {
    if (!reglas) return basePostDescuentos
    if (k === 'efectivo')            return basePostDescuentos - Math.round(basePostDescuentos * (reglas.desc_efectivo_pct ?? 0) / 100)
    if (k === 'transferencia_negro') return basePostDescuentos - Math.round(basePostDescuentos * (reglas.desc_transferencia_pct ?? 0) / 100)
    if (k in recargoConIvaPct)       return basePostDescuentos + Math.round(basePostDescuentos * recargoConIvaPct[k] / 100)
    return basePostDescuentos
  }
  const totalBtnConIva = totalMayoristaConMetodo('transferencia_blanco')

  // % de descuento a mostrar junto al nombre de cada método mayorista
  const pctMetodoMayorista: Record<string, number> = {
    efectivo:            reglas?.desc_efectivo_pct ?? 0,
    transferencia_negro: reglas?.desc_transferencia_pct ?? 0,
  }

  // Ajuste a reflejar en el Total: si todavía no eligió forma de pago, usar el ajuste
  // representativo del tipo de facturación (Con IVA / Sin IVA) ya seleccionado, para
  // que el Total cambie sin necesidad de marcar una forma de pago primero.
  const ajusteEfectivo = metodoPago
    ? ajuste
    : facturaIva === 'con'
      ? totalBtnConIva - basePostDescuentos
      : 0

  // Base para evaluar mínimo de compra / envío gratis: subtotal − desc web/volumen,
  // SIN el ajuste por forma de pago (pedido del tester 2026-07, alineado con el server).
  // Mayorista: Total Bruto. Minorista: total con IVA post volumen (no tiene desc. web).
  const totalPostDescuentoPreEnvio = basePostDescuentos

  // Envío gratis — mismo criterio que el server, evaluado sobre el total vigente
  const esAmbaEnvio = envioSeleccionado ? ['B', 'C'].includes(envioSeleccionado.provincia) : false
  const umbralAmba = reglas?.envio_amba_gratis_desde ?? null
  const umbralGeneral = reglas?.envio_gratis_desde ?? null
  const envioEsGratis = envioSeleccionado !== null && (
    (umbralAmba !== null && esAmbaEnvio && totalPostDescuentoPreEnvio >= umbralAmba) ||
    (umbralGeneral !== null && totalPostDescuentoPreEnvio >= umbralGeneral)
  )
  const costoEnvio = envioSeleccionado ? (envioEsGratis ? 0 : envioSeleccionado.costo) : 0

  // Total minorista mostrado en el resumen — sin el descuento por forma de pago:
  // ese descuento se ve solo en la opción de pago (confirmado por el tester 2026-07-07)
  const totalConEnvio = basePostDescuentos + costoEnvio
  const totalFinal = basePostDescuentos + ajusteEfectivo + costoEnvio

  // "Precio sin impuestos nacionales" a mostrar chico bajo el Total — solo minorista,
  // sin incluir el envío (pedido del tester)
  const netTotalDisplay = totalGeneral > 0
    ? Math.round((totalConEnvio - costoEnvio) * (totalSinIVA / totalGeneral))
    : 0

  // Cuánto falta para alcanzar el envío gratis (umbral aplicable más cercano)
  const umbralEnvioAplicable = esAmbaEnvio && umbralAmba !== null
    ? Math.min(umbralAmba, umbralGeneral ?? Infinity)
    : umbralGeneral
  const faltaParaEnvioGratis =
    (esMinorista || esGuest) && umbralEnvioAplicable !== null && totalPostDescuentoPreEnvio < umbralEnvioAplicable
      ? umbralEnvioAplicable - totalPostDescuentoPreEnvio
      : null

  // Envío gratis conocido ANTES de cotizar: el umbral general no depende de la
  // provincia, así que si el monto ya lo alcanza sabemos que el envío es gratis
  // sin pedirle al usuario que calcule un costo. Solo necesitamos su dirección.
  const envioGratisPorMonto =
    (esMinorista || esGuest) && umbralGeneral !== null && totalPostDescuentoPreEnvio >= umbralGeneral

  // Total final si el minorista eligiera ese método — se muestra en $ dentro de cada botón
  function totalMinoristaConMetodo(metodo: string): number {
    const pct = metodo === 'transferencia' ? (reglas?.desc_transferencia_pct ?? 0) : 0
    const base = basePostDescuentos - Math.round(basePostDescuentos * pct / 100)
    // El envío gratis se evalúa sobre la base SIN el descuento por forma de pago,
    // igual que el server — así el umbral no cambia según el método elegido
    const gratis = envioSeleccionado !== null && (
      (umbralAmba !== null && esAmbaEnvio && basePostDescuentos >= umbralAmba) ||
      (umbralGeneral !== null && basePostDescuentos >= umbralGeneral)
    )
    return base + (envioSeleccionado ? (gratis ? 0 : envioSeleccionado.costo) : 0)
  }

  const minimoInsuficiente = Boolean(reglas?.minimo_compra && totalPostDescuentoPreEnvio < reglas.minimo_compra)
  const totalUnidades = items.reduce((a, i) => a + i.cantidad, 0)

  // Stock: null = sin control, number = límite conocido.
  // Mientras no llegó el refresh desde el servidor, usamos el stock guardado al agregar
  // al carrito (item.stock) en vez de asumir "sin control" — evita la ventana sin clamp.
  function stockDisponible(item: (typeof items)[number]): number | null {
    const key = item.itemKey ?? `${item.productoId}:`
    if (key in stocks) return stocks[key]
    return item.stock ?? null
  }
  function exceedeStock(item: (typeof items)[number]): boolean {
    const s = stockDisponible(item)
    return s !== null && item.cantidad > s
  }
  const hayProblemaStock = items.some(i => exceedeStock(i))

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
      {editingPedidoId && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm flex items-center justify-between gap-3" style={{ background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>
          <span>Estás editando el pedido #{editingPedidoNumero}. Al confirmar, se actualiza ese mismo pedido.</span>
          <button
            onClick={() => clear()}
            className="underline shrink-0"
          >
            Cancelar edición
          </button>
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
              const stockItem = stockDisponible(item)
              const masAllaDelStock = exceedeStock(item)
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
                          {formatPrecio(item.precio)} c/u
                        </p>
                      )}
                    </div>

                    {/* Stepper + Eliminar */}
                    <div className="flex items-center gap-4 flex-wrap">
                      <QuantityStepper
                        value={item.cantidad}
                        multiplo={multiplo}
                        max={stockItem}
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

        {/* Resumen — sticky y con scroll propio: si es más alto que la pantalla,
            no debe depender de scrollear toda la lista de productos para ver el final. */}
        <div
          className="w-full lg:w-72 rounded-xl border p-5 flex flex-col gap-4 lg:sticky lg:top-28 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto"
          data-lenis-prevent
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
                {/* Línea que separa productos de subtotales/descuentos */}
                <div className="h-px my-1" style={{ background: 'var(--color-acero-claro)' }} />
                {/* Subtotal — minoristas y guests: precio con IVA.
                    Mayoristas: precio bruto (sin IVA). */}
                <div className="flex justify-between" style={{ color: 'var(--color-acero-oscuro)' }}>
                  <span>{esMayorista ? 'Subtotal Bruto' : 'Subtotal'}</span>
                  <span>{formatPrecio(totalGeneral)}</span>
                </div>
                {/* Solo descuentos previos al pago (web, volumen) — los descuentos por
                    forma de pago se ven en el precio de cada opción, no acá */}
                {ajusteAutogestion !== 0 && (
                  <div className="flex justify-between text-xs font-medium" style={{ color: '#16a34a' }}>
                    <span>Desc. web ({descAutogestPct}%)</span>
                    <span>-{formatPrecio(Math.abs(ajusteAutogestion))}</span>
                  </div>
                )}
                {ajusteVolumenCanal !== 0 && (
                  <div className="flex justify-between text-xs font-medium" style={{ color: '#16a34a' }}>
                    <span>Desc. por vol({descVolCanalPct}%)</span>
                    <span>-{formatPrecio(Math.abs(ajusteVolumenCanal))}</span>
                  </div>
                )}
                {envioSeleccionado && (
                  <div className="flex justify-between" style={{ color: 'var(--color-acero-oscuro)' }}>
                    <span>Envío</span>
                    {envioEsGratis
                      ? <span className="font-medium" style={{ color: '#16a34a' }}>Gratis</span>
                      : <span>{formatPrecio(costoEnvio)}</span>}
                  </div>
                )}
                <div className="h-px my-1" style={{ background: 'var(--color-acero-claro)' }} />
                {!esMayorista ? (
                  <>
                    <div className="flex justify-between font-semibold text-lg" style={{ color: 'var(--foreground)' }}>
                      <span>Total</span>
                      <span>{formatPrecio(totalConEnvio)}</span>
                    </div>
                    <div className="flex justify-between text-xs -mt-1" style={{ color: 'var(--color-acero-oscuro)' }}>
                      <span>Precio sin impuestos nacionales:</span>
                      <span>{formatPrecio(netTotalDisplay)}</span>
                    </div>
                    {metodoPagoMinorista !== 'transferencia' && (
                      <p className="text-xs leading-snug" style={{ color: 'var(--color-acero-oscuro)' }}>
                        Precio de contado. Si pagás en cuotas con tarjeta, Mercado Pago aplica el interés de tu banco.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    {/* Los totales mayoristas no cambian con la forma de pago elegida —
                        el precio final de cada método se ve en su botón */}
                    <div className="flex justify-between font-semibold" style={{ color: 'var(--foreground)' }}>
                      <span>Total Bruto</span>
                      <span>{formatPrecio(totalBrutoMayorista)}</span>
                    </div>
                    <div className="flex justify-between font-semibold" style={{ color: 'var(--foreground)' }}>
                      <span>Total IVA incluido</span>
                      <span>{formatPrecio(totalIvaIncluidoMayorista)}</span>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <div className="h-px" style={{ background: 'var(--color-acero-claro)' }} />

          {/* Cotizador de envío — obligatorio para minoristas y guests */}
          {(esMinorista || esGuest) && (
            <EnvioCotizador
              items={items.map(i => ({ productoId: i.productoId, cantidad: i.cantidad }))}
              seleccionada={envioSeleccionado ? { ...envioSeleccionado, costo: costoEnvio } : null}
              onSelect={handleEnvioSelect}
              envioFlexActivo={reglas?.envio_flex_activo ?? true}
              gratis={envioGratisPorMonto}
              defaultOpen
            />
          )}

          {/* CTA según rol */}
          {esMinorista ? (
            <>
              {/* WhatsApp de contacto — obligatorio para poder avisar por stock */}
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-acero-oscuro)' }}>
                  WhatsApp de contacto *
                </label>
                <input
                  type="tel"
                  value={telefonoMinorista}
                  onChange={e => setTelefonoMinorista(e.target.value)}
                  placeholder="+54 9 11 1234-5678"
                  className={inputClass}
                  style={inputStyle}
                />
                <p className="text-[11px] mt-1" style={{ color: 'var(--color-acero-oscuro)' }}>
                  Te avisamos por acá si hay algún tema con el stock de tu pedido.
                </p>
              </div>

              {!envioSeleccionado && !envioGratisPorMonto && (
                <p className="text-xs text-center" style={{ color: 'var(--color-acero-oscuro)' }}>
                  Calculá el envío para continuar.
                </p>
              )}

              {envioGratisPorMonto && (
                <div className="px-3 py-2 rounded-lg text-xs font-medium" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                  🎉 ¡Tenés envío gratis! Ingresá la dirección de entrega para continuar.
                </div>
              )}

              {/* Selector de método si ambos están activos */}
              {ambosPagosMinorista && (
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-acero-oscuro)' }}>Forma de pago</p>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { key: 'mercado_pago', label: 'Mercado Pago', descPct: 0 },
                      { key: 'transferencia', label: 'Transferencia', descPct: reglas?.desc_transferencia_pct ?? 0 },
                    ].map(m => (
                      <label
                        key={m.key}
                        className="flex items-center gap-2.5 cursor-pointer px-3 py-2 rounded-lg border transition-colors"
                        style={{
                          borderColor: metodoPagoMinorista === m.key ? 'var(--color-granito-oscuro)' : 'var(--color-acero-claro)',
                          background:  metodoPagoMinorista === m.key ? 'var(--color-acero-brillo)' : 'white',
                        }}
                      >
                        <input
                          type="radio"
                          name="metodo_minorista"
                          value={m.key}
                          checked={metodoPagoMinorista === m.key}
                          onChange={() => setMetodoPagoMinorista(m.key)}
                          className="flex-shrink-0"
                        />
                        <span className="text-sm flex-1" style={{ color: 'var(--foreground)' }}>{m.label}{m.descPct > 0 ? ` (${m.descPct}%)` : ''}</span>
                        {/* Total final en $ con el descuento del método aplicado — más claro que el % */}
                        {mostrarPrecios && totalGeneral > 0 && (
                          <span className="text-xs font-medium" style={{ color: m.descPct > 0 ? '#16a34a' : 'var(--color-acero-oscuro)' }}>
                            {formatPrecio(totalMinoristaConMetodo(m.key))}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Aviso mínimo de compra — minoristas */}
              {minimoInsuficiente && reglas?.minimo_compra && (
                <div className="px-3 py-2 rounded-lg text-xs" style={{ background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa' }}>
                  Mínimo de compra: {formatPrecio(reglas.minimo_compra)}.{' '}
                  Te faltan {formatPrecio(reglas.minimo_compra - totalPostDescuentoPreEnvio)}.
                </div>
              )}

              {/* Aviso envío gratis cercano */}
              {faltaParaEnvioGratis !== null && (
                <div className="px-3 py-2 rounded-lg text-xs" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                  Te faltan {formatPrecio(faltaParaEnvioGratis)} para el envío gratis.
                </div>
              )}

              {/* Aviso descuento por volumen cercano */}
              {avisoDescVolumen}

              {/* Botón Mercado Pago */}
              {metodoPagoMinorista === 'mercado_pago' && (
                <button
                  onClick={() => handlePagarMP()}
                  disabled={pagando || hayProblemaStock || refreshingPrecios || !envioSeleccionado || minimoInsuficiente || !telefonoMinoristaValido}
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
              )}

              {/* Botón Transferencia — sin adjuntar comprobante acá: se sube después, desde el detalle del pedido */}
              {metodoPagoMinorista === 'transferencia' && (
                <>
                  <button
                    onClick={handlePagarTransferencia}
                    disabled={pagando || hayProblemaStock || refreshingPrecios || !envioSeleccionado || minimoInsuficiente || !telefonoMinoristaValido}
                    className="w-full py-3 rounded-lg text-base font-medium flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                    style={{ background: 'var(--color-granito-oscuro)', color: 'white' }}
                  >
                    {pagando ? (
                      <><Loader2 size={15} className="animate-spin" /> Procesando…</>
                    ) : refreshingPrecios ? (
                      <><Loader2 size={15} className="animate-spin" /> Verificando precios…</>
                    ) : (
                      'Confirmar y pagar por transferencia'
                    )}
                  </button>
                </>
              )}

              {/* Sin métodos activos */}
              {!mpActivo && !transferenciaActiva && reglas && (
                <p className="text-xs text-center" style={{ color: 'var(--color-acero-oscuro)' }}>
                  Contactanos para completar tu pago.
                </p>
              )}

              {/* Botón WhatsApp — igual que en mayoristas */}
              <a
                href={`https://wa.me/${WA_NUMBER}?text=${buildWhatsAppMsg(items, metodoPagoMinorista, mostrarPrecios && totalConEnvio > 0 ? (metodoPagoMinorista ? totalMinoristaConMetodo(metodoPagoMinorista) : totalConEnvio) : undefined, null, reglas?.whatsapp_tipo ?? 'bot')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-lg text-sm font-medium text-center flex items-center justify-center gap-2 transition-opacity border"
                style={{ borderColor: '#25D366', color: '#25D366', background: 'white' }}
              >
                <WhatsAppIcon />
                Consultanos por WhatsApp
              </a>

              {errorPago && (
                <p className="text-xs text-center" style={{ color: '#ef4444' }}>{errorPago}</p>
              )}
            </>
          ) : esMayorista ? (
            <div className="flex flex-col gap-3">

              {/* Forma de pago — todas las opciones a la vez, agrupadas en dos columnas por tipo de factura */}
              {(metodosConIva.length > 0 || metodosSinIva.length > 0) && (
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-acero-oscuro)' }}>
                    Forma de pago
                  </p>
                  <div className={metodosConIva.length > 0 && metodosSinIva.length > 0 ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'}>
                    {metodosConIva.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>Con Factura (+IVA)</p>
                      {metodosConIva.map(k => (
                        <label
                          key={k}
                          className="flex flex-col items-start gap-0.5 cursor-pointer px-2.5 py-2 rounded-lg border transition-colors"
                          style={{
                            borderColor: metodoPago === k ? 'var(--color-granito-oscuro)' : 'var(--color-acero-claro)',
                            background:  metodoPago === k ? 'var(--color-acero-brillo)' : 'white',
                          }}
                        >
                          <input type="radio" name="metodo_pago" value={k} checked={metodoPago === k}
                            onChange={() => { setFacturaIva('con'); setMetodoPago(k); setComprobantePath(null) }} className="sr-only" />
                          <span className="text-xs" style={{ color: 'var(--foreground)' }}>
                            {metodoLabelCorto(k)}{(pctMetodoMayorista[k] ?? 0) > 0 ? ` (${pctMetodoMayorista[k]}%)` : ''}
                          </span>
                          {mostrarPrecios && totalGeneral > 0 && (
                            <span
                              className="text-xs font-medium"
                              style={{ color: totalMayoristaConMetodo(k) < totalBtnConIva ? '#16a34a' : 'var(--foreground)' }}
                            >
                              {formatPrecio(totalMayoristaConMetodo(k))}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                    )}
                    {metodosSinIva.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>Sin Factura (Sin IVA)</p>
                      {metodosSinIva.map(k => (
                        <label
                          key={k}
                          className="flex flex-col items-start gap-0.5 cursor-pointer px-2.5 py-2 rounded-lg border transition-colors"
                          style={{
                            borderColor: metodoPago === k ? 'var(--color-granito-oscuro)' : 'var(--color-acero-claro)',
                            background:  metodoPago === k ? 'var(--color-acero-brillo)' : 'white',
                          }}
                        >
                          <input type="radio" name="metodo_pago" value={k} checked={metodoPago === k}
                            onChange={() => { setFacturaIva('sin'); setMetodoPago(k); setComprobantePath(null) }} className="sr-only" />
                          <span className="text-xs" style={{ color: 'var(--foreground)' }}>
                            {metodoLabelCorto(k)}{(pctMetodoMayorista[k] ?? 0) > 0 ? ` (${pctMetodoMayorista[k]}%)` : ''}
                          </span>
                          {mostrarPrecios && totalGeneral > 0 && (
                            <span
                              className="text-xs font-medium"
                              style={{ color: totalMayoristaConMetodo(k) < totalBtnConIva ? '#16a34a' : 'var(--foreground)' }}
                            >
                              {formatPrecio(totalMayoristaConMetodo(k))}
                            </span>
                          )}
                          {k === 'transferencia_negro' && metodoPago === k && cbuSinIva && (
                            <span className="flex flex-col gap-0.5 mt-0.5 w-full min-w-0">
                              {tipoCuentaSinIva === 'deposito' ? (
                                <>
                                  {cuitSinIva && <DatoCopiable label="CUIT" value={cuitSinIva} />}
                                  {bancoSinIva && <DatoCopiable label="Banco" value={bancoSinIva} />}
                                  <DatoCopiable label="CTA/CTE" value={cbuSinIva} />
                                </>
                              ) : (
                                <>
                                  {aliasSinIva && <DatoCopiable label="Alias" value={aliasSinIva} />}
                                  <DatoCopiable label={tipoCuentaSinIva} value={cbuSinIva} />
                                </>
                              )}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                    )}
                  </div>
                </div>
              )}

              {/* Aviso línea de crédito — visible para todo mayorista sin crédito aprobado */}
              {reglas && !reglas.credito_aprobado && (
                <div className="px-3 py-2.5 rounded-lg text-xs flex flex-col gap-2" style={{ background: '#fef9c3', border: '1px solid #fde68a' }}>
                  <div className="flex flex-col gap-1">
                    <p className="font-medium" style={{ color: '#854d0e' }}>
                      {canalHabilitaFinanciado ? 'Cheque financiado disponible con línea de crédito' : '¿Necesitás pago diferido?'}
                    </p>
                    <p style={{ color: '#92400e' }}>
                      {canalHabilitaFinanciado
                        ? 'Tu canal permite operar con cheques a plazo, pero necesitás una línea de crédito aprobada.'
                        : 'Podés solicitar una línea de crédito para operar en cuenta corriente o con cheques a plazo.'}
                      {' '}Podés solicitarla ahora — Gastón la evalúa en 48–72 hs hábiles.
                    </p>
                  </div>
                  <a
                    href="/cuenta/financiacion"
                    className="self-start px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: '#854d0e', color: '#fef9c3' }}
                  >
                    Calificar para pago diferido
                  </a>
                </div>
              )}

              {/* Aviso mínimo de compra */}
              {minimoInsuficiente && reglas?.minimo_compra && (
                <div className="px-3 py-2 rounded-lg text-xs" style={{ background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa' }}>
                  Mínimo de compra: {formatPrecio(reglas.minimo_compra)}.{' '}
                  Te faltan {formatPrecio(reglas.minimo_compra - totalPostDescuentoPreEnvio)}.
                </div>
              )}

              {/* Aviso descuento por volumen cercano */}
              {avisoDescVolumen}

              {/* Dirección de retiro */}
              {reglas?.mostrar_direccion_en_web && reglas?.direccion_negocio && (
                <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--color-acero-brillo)', border: '1px solid var(--color-acero-claro)' }}>
                  <p className="font-medium mb-0.5" style={{ color: 'var(--foreground)' }}>Dirección de retiro</p>
                  <p style={{ color: 'var(--color-acero-oscuro)' }}>{reglas.direccion_negocio}</p>
                </div>
              )}

              {/* Selector de dirección de entrega */}
              {direcciones.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>
                      Dirección de entrega
                    </p>
                    <a href="/cuenta/direcciones?from=carrito" className="text-xs underline"
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
                <a href="/cuenta/direcciones?from=carrito"
                  className="text-xs py-2 px-3 rounded-lg border border-dashed text-center transition-colors"
                  style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}>
                  + Agregar dirección de entrega
                </a>
              )}

              {/* Confirmar pedido (requiere IVA + método seleccionados) */}
              {facturaIva && metodoPago && (
                <button
                  onClick={handleConfirmarPedidoMayorista}
                  disabled={pagando || hayProblemaStock || refreshingPrecios || minimoInsuficiente}
                  className="w-full py-3 rounded-lg text-base font-medium flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                  style={{ background: 'var(--color-granito-oscuro)', color: 'var(--color-acero-brillo)' }}
                >
                  {pagando ? (
                    <><Loader2 size={15} className="animate-spin" /> Procesando…</>
                  ) : refreshingPrecios ? (
                    <><Loader2 size={15} className="animate-spin" /> Verificando precios…</>
                  ) : (
                    'Confirmar pedido'
                  )}
                </button>
              )}

              {/* Botón WhatsApp — alternativa siempre disponible */}
              <a
                href={`https://wa.me/${WA_NUMBER}?text=${buildWhatsAppMsg(items, metodoPago, mostrarPrecios && totalFinal > 0 ? totalFinal : undefined, direccionId ? direcciones.find(d => d.id === direccionId) : null, reglas?.whatsapp_tipo ?? 'bot')}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={minimoInsuficiente || hayProblemaStock}
                className="w-full py-2.5 rounded-lg text-sm font-medium text-center flex items-center justify-center gap-2 transition-opacity border"
                style={{
                  borderColor: '#25D366',
                  color: '#25D366',
                  background: 'white',
                  opacity: minimoInsuficiente || hayProblemaStock ? 0.4 : 1,
                  pointerEvents: minimoInsuficiente || hayProblemaStock ? 'none' : 'auto',
                }}
              >
                <WhatsAppIcon />
                Consultanos por WhatsApp
              </a>

              {errorPago && (
                <p className="text-xs text-center" style={{ color: '#ef4444' }}>{errorPago}</p>
              )}

              {/* Acceso al formulario de financiamiento — siempre disponible para
                  mayoristas, igual que en el carrito desplegable. Cuando el crédito
                  todavía no está aprobado, el aviso amarillo de arriba ya lleva al
                  formulario, así que este link se muestra solo para no duplicarlo. */}
              {reglas?.credito_aprobado && (
                <a
                  href="/cuenta/financiacion"
                  className="w-full py-2 rounded-lg text-xs text-center transition-colors"
                  style={{ color: 'var(--color-acero-oscuro)' }}
                >
                  ¿Necesitás financiamiento? <span className="underline">Solicitalo acá →</span>
                </a>
              )}
            </div>
          ) : esGuest ? (
            // ── Comprador sin cuenta ────────────────────────────────────
            <>
              {!envioSeleccionado && !envioGratisPorMonto && (
                <p className="text-xs text-center" style={{ color: 'var(--color-acero-oscuro)' }}>
                  Calculá el envío para continuar.
                </p>
              )}

              {envioGratisPorMonto && (
                <div className="px-3 py-2 rounded-lg text-xs font-medium" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                  🎉 ¡Tenés envío gratis! Ingresá la dirección de entrega para continuar.
                </div>
              )}

              {/* Avisos de mínimo de compra y envío gratis — el server los aplica también a guests */}
              {minimoInsuficiente && reglas?.minimo_compra && (
                <div className="px-3 py-2 rounded-lg text-xs" style={{ background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa' }}>
                  Mínimo de compra: {formatPrecio(reglas.minimo_compra)}.{' '}
                  Te faltan {formatPrecio(reglas.minimo_compra - totalPostDescuentoPreEnvio)}.
                </div>
              )}
              {faltaParaEnvioGratis !== null && (
                <div className="px-3 py-2 rounded-lg text-xs" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                  Te faltan {formatPrecio(faltaParaEnvioGratis)} para el envío gratis.
                </div>
              )}
              {avisoDescVolumen}

              {/* Selector de método si ambos están activos */}
              {ambosPagosMinorista && (
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-acero-oscuro)' }}>Forma de pago</p>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { key: 'mercado_pago', label: 'Mercado Pago', descPct: 0 },
                      { key: 'transferencia', label: 'Transferencia', descPct: reglas?.desc_transferencia_pct ?? 0 },
                    ].map(m => (
                      <label
                        key={m.key}
                        className="flex items-center gap-2.5 cursor-pointer px-3 py-2 rounded-lg border transition-colors"
                        style={{
                          borderColor: metodoPagoMinorista === m.key ? 'var(--color-granito-oscuro)' : 'var(--color-acero-claro)',
                          background:  metodoPagoMinorista === m.key ? 'var(--color-acero-brillo)' : 'white',
                        }}
                      >
                        <input
                          type="radio"
                          name="metodo_guest"
                          value={m.key}
                          checked={metodoPagoMinorista === m.key}
                          onChange={() => setMetodoPagoMinorista(m.key)}
                          className="flex-shrink-0"
                        />
                        <span className="text-sm flex-1" style={{ color: 'var(--foreground)' }}>{m.label}{m.descPct > 0 ? ` (${m.descPct}%)` : ''}</span>
                        {mostrarPrecios && totalGeneral > 0 && (
                          <span className="text-xs font-medium" style={{ color: m.descPct > 0 ? '#16a34a' : 'var(--color-acero-oscuro)' }}>
                            {formatPrecio(totalMinoristaConMetodo(m.key))}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Transferencia: el invitado debe adjuntar el comprobante acá mismo
                  (no tiene una cuenta a la que volver para subirlo después) */}
              {metodoPagoMinorista === 'transferencia' && (
                <UploaderComprobante
                  path={comprobantePath}
                  uploading={uploadingComp}
                  error={compError}
                  onFile={handleUploadComprobante}
                  onClear={() => { setComprobantePath(null); setCompError(null) }}
                />
              )}

              {metodoPagoMinorista === 'transferencia' ? (
                <button
                  onClick={() => setGuestModalOpen(true)}
                  disabled={pagando || hayProblemaStock || refreshingPrecios || !envioSeleccionado || minimoInsuficiente || !comprobantePath}
                  className="w-full py-3 rounded-lg text-base font-medium flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                  style={{ background: 'var(--color-granito-oscuro)', color: 'white' }}
                >
                  {pagando ? (
                    <><Loader2 size={15} className="animate-spin" /> Procesando…</>
                  ) : refreshingPrecios ? (
                    <><Loader2 size={15} className="animate-spin" /> Verificando precios…</>
                  ) : (
                    'Confirmar y enviar comprobante'
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setGuestModalOpen(true)}
                  disabled={pagando || hayProblemaStock || refreshingPrecios || !envioSeleccionado || minimoInsuficiente}
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
              )}

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
                placeholder="WhatsApp *"
                value={guestTelefono}
                onChange={e => { setGuestTelefono(e.target.value); setGuestErrors(null) }}
                className={inputClass}
                style={inputStyle}
              />
              <p className="text-[11px]" style={{ color: 'var(--color-acero-oscuro)' }}>
                Te avisamos por WhatsApp si hay algún tema con el stock de tu pedido.
              </p>
            </div>

            {guestErrors && (
              <p className="text-xs" style={{ color: '#ef4444' }}>{guestErrors}</p>
            )}

            <button
              onClick={handlePagarGuest}
              disabled={pagando}
              className="w-full py-3 rounded-lg text-base font-medium flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
              style={{ background: metodoPagoMinorista === 'transferencia' ? 'var(--color-granito-oscuro)' : '#009ee3', color: 'white' }}
            >
              {pagando ? (
                <><Loader2 size={15} className="animate-spin" /> Procesando…</>
              ) : metodoPagoMinorista === 'transferencia' ? (
                'Confirmar pedido'
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
