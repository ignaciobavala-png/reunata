'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ShoppingBag, Loader2, Trash2, Upload, Check } from 'lucide-react'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { useCartStore } from '@/stores/cartStore'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { iniciarCheckoutMP, iniciarCheckoutTransferencia } from '@/app/actions/checkout'
import { crearPedidoBorrador } from '@/app/actions/pedidos'
import { formatPrecio } from '@/lib/utils'
import { EnvioCotizador, type EnvioSeleccionado } from '@/components/cliente/EnvioCotizador'
import { VarianteBadge } from '@/components/sections/ColorPicker'

const WA_NUMBER = '5491132720974'

const METODOS_CON_IVA = ['transferencia_blanco', 'echeq_propio', 'echeq_al_dia']
const METODOS_SIN_IVA = ['efectivo', 'transferencia_negro']
const METODOS_CON_COMPROBANTE = new Set([
  'transferencia', 'transferencia_negro', 'transferencia_blanco',
  'echeq_al_dia', 'echeq_propio', 'echeq_tercero',
  'cheque_fisico_al_dia', 'cheque_fisico_financiado',
])
const METODO_LABEL: Record<string, string> = {
  efectivo:             'Efectivo',
  transferencia_negro:  'Transferencia',
  transferencia_blanco: 'Transferencia al banco (Factura A)',
  echeq_propio:         'E-cheq propio',
  echeq_al_dia:         'E-cheq al día',
  mercado_pago:         'Mercado Pago',
  transferencia:        'Transferencia',
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

interface ReglaCanal {
  pagos_habilitados:               Record<string, { activo: boolean }>
  minimo_compra:                   number | null
  desc_efectivo_pct:               number
  recargo_transf_blanco_pct:       number
  desc_transferencia_pct:          number
  desc_autogestion_primera_pct:    number
  desc_autogestion_siguientes_pct: number
  desc_volumen_monto_min:          number | null
  desc_volumen_pct:                number | null
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
  const { items, remove, updateCantidad, updatePrecios, updateStocks, clear, total, guestItemsMerged, clearGuestMergedFlag } = useCartStore()
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

  // Auto-seleccionar método de pago para minoristas cuando cargan las reglas
  useEffect(() => {
    if (!reglas || !esMinorista) return
    const mp    = reglas.pagos_habilitados?.['mercado_pago']?.activo ?? false
    const transf = reglas.pagos_habilitados?.['transferencia']?.activo ?? false
    if (mp) setMetodoPagoMinorista('mercado_pago')
    else if (transf) setMetodoPagoMinorista('transferencia')
  }, [reglas, esMinorista])

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
    try {
      const pedidoId = await crearPedidoBorrador(
        items.map(i => ({ productoId: i.productoId, cantidad: i.cantidad, variante: i.variante })),
        { medioPago: metodoPago, facturaIva: facturaIva === 'con', comprobantePath: comprobantePath ?? undefined },
      )
      clear()
      router.push(`/pedidos/${pedidoId}`)
    } catch (e) {
      setErrorPago(e instanceof Error ? e.message : 'Error al confirmar el pedido. Intentá de nuevo.')
      setPagando(false)
    }
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

  // Desglose IVA — para minoristas y guests el precio del carrito ya incluye IVA;
  // para mayoristas el precio es neto, así que el Precio Bruto ES el total
  const totalSinIVA = (!esMayorista)
    ? items.reduce((acc, i) => {
        const rate = ivaRates[i.productoId] ?? 0.21
        return acc + Math.round(i.precio / (1 + rate)) * i.cantidad
      }, 0)
    : totalGeneral

  // Descuento por volumen del canal — toma como referencia el Precio Bruto (sin IVA),
  // tanto para el umbral como para el monto. Mismo criterio que el server (checkout.ts).
  const descVolCanalMin = reglas?.desc_volumen_monto_min ?? null
  const descVolCanalPct = reglas?.desc_volumen_pct ?? 0
  const ajusteVolumenCanal = descVolCanalMin !== null && descVolCanalPct > 0 && totalSinIVA >= descVolCanalMin
    ? -Math.round(totalSinIVA * descVolCanalPct / 100)
    : 0
  const basePostVolumenCanal = totalGeneral + ajusteVolumenCanal

  // Cuánto falta para alcanzar el descuento por volumen del canal (en Precio Bruto)
  const faltaParaDescVolumen = descVolCanalMin !== null && descVolCanalPct > 0 && totalSinIVA < descVolCanalMin
    ? descVolCanalMin - totalSinIVA
    : null

  // Métodos disponibles para consumidor_final (leídos de reglas del canal)
  const mpActivo          = esMinorista ? (reglas?.pagos_habilitados?.['mercado_pago']?.activo  ?? false) : false
  const transferenciaActiva = esMinorista ? (reglas?.pagos_habilitados?.['transferencia']?.activo ?? false) : false
  const ambosPagosMinorista = mpActivo && transferenciaActiva

  // Descuento de transferencia para minoristas — sobre el precio ya descontado por volumen
  const descTransfPct = esMinorista && metodoPagoMinorista === 'transferencia'
    ? (reglas?.desc_transferencia_pct ?? 0)
    : 0
  const ajusteTransfMinorista = descTransfPct > 0 ? -Math.round(basePostVolumenCanal * descTransfPct / 100) : 0

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
  const metodosActivosActuales = facturaIva === 'con' ? metodosConIva : facturaIva === 'sin' ? metodosSinIva : []

  // Descuento de autogestión web (primera vs siguientes compras, solo mayoristas) — sobre el precio ya descontado por volumen
  const descAutogestPct = esMayorista && reglas
    ? (reglas.es_primera_compra
        ? (reglas.desc_autogestion_primera_pct ?? 0)
        : (reglas.desc_autogestion_siguientes_pct ?? 0))
    : 0
  const ajusteAutogestion = descAutogestPct > 0 ? -Math.round(basePostVolumenCanal * descAutogestPct / 100) : 0
  const basePostAutogestion = basePostVolumenCanal + ajusteAutogestion

  // Descuento/recargo por método de pago — se aplica sobre el precio ya descontado por web
  const ajuste = metodoPago && reglas
    ? metodoPago === 'efectivo'
      ? -Math.round(basePostAutogestion * (reglas.desc_efectivo_pct ?? 0) / 100)
      : metodoPago === 'transferencia_negro'
        ? -Math.round(basePostAutogestion * (reglas.desc_transferencia_pct ?? 0) / 100)
        : metodoPago === 'transferencia_blanco'
          ? Math.round(basePostAutogestion * (reglas.recargo_transf_blanco_pct ?? 21) / 100)
          : 0
    : 0

  // ── Presentación mayorista "IVA incluido" ─────────────────────────────
  // El precio arranca mostrado con IVA; al elegir "Sin IVA" se resta como "Desc IVA".
  // Los montos cobrados no cambian (misma cascada de siempre) — solo la presentación.
  const totalConIvaMayorista = esMayorista
    ? items.reduce((acc, i) => acc + Math.round(i.precio * (1 + (ivaRates[i.productoId] ?? 0.21))) * i.cantidad, 0)
    : 0
  const descIvaMayorista = totalConIvaMayorista - totalGeneral
  const recargoIvaPct = reglas?.recargo_transf_blanco_pct ?? 21
  const enConIva = esMayorista && facturaIva === 'con'
  // Con "Con IVA" el resumen se muestra en valores IVA incluido: los descuentos se
  // escalan por el recargo para que las líneas cierren contra el Total (± redondeo).
  const factorDisplay = enConIva ? 1 + recargoIvaPct / 100 : 1
  const dispVolumenCanal = -Math.round(Math.abs(ajusteVolumenCanal) * factorDisplay)
  const dispAutogestion  = -Math.round(Math.abs(ajusteAutogestion) * factorDisplay)

  // Total final si el mayorista eligiera ese método — se muestra en $ dentro de cada botón
  function totalMayoristaConMetodo(k: string): number {
    if (!reglas) return basePostAutogestion
    if (k === 'efectivo')             return basePostAutogestion - Math.round(basePostAutogestion * (reglas.desc_efectivo_pct ?? 0) / 100)
    if (k === 'transferencia_negro')  return basePostAutogestion - Math.round(basePostAutogestion * (reglas.desc_transferencia_pct ?? 0) / 100)
    if (k === 'transferencia_blanco') return basePostAutogestion + Math.round(basePostAutogestion * (reglas.recargo_transf_blanco_pct ?? 21) / 100)
    return basePostAutogestion
  }
  const totalBtnConIva = totalMayoristaConMetodo('transferencia_blanco')
  const totalBtnSinIva = basePostAutogestion

  // Base para evaluar mínimo de compra / envío gratis: post-descuentos, pre-envío
  const totalPostDescuentoPreEnvio = esMayorista
    ? basePostAutogestion + ajuste
    : basePostVolumenCanal + ajusteTransfMinorista

  // Envío gratis — mismo criterio que el server, evaluado sobre el total vigente
  const esAmbaEnvio = envioSeleccionado ? ['B', 'C'].includes(envioSeleccionado.provincia) : false
  const umbralAmba = reglas?.envio_amba_gratis_desde ?? null
  const umbralGeneral = reglas?.envio_gratis_desde ?? null
  const envioEsGratis = envioSeleccionado !== null && (
    (umbralAmba !== null && esAmbaEnvio && totalPostDescuentoPreEnvio >= umbralAmba) ||
    (umbralGeneral !== null && totalPostDescuentoPreEnvio >= umbralGeneral)
  )
  const costoEnvio = envioSeleccionado ? (envioEsGratis ? 0 : envioSeleccionado.costo) : 0

  const totalConEnvio = basePostVolumenCanal + ajusteTransfMinorista + costoEnvio
  const totalFinal = basePostAutogestion + ajuste + costoEnvio

  // Cuánto falta para alcanzar el envío gratis (umbral aplicable más cercano)
  const umbralEnvioAplicable = esAmbaEnvio && umbralAmba !== null
    ? Math.min(umbralAmba, umbralGeneral ?? Infinity)
    : umbralGeneral
  const faltaParaEnvioGratis =
    (esMinorista || esGuest) && umbralEnvioAplicable !== null && totalPostDescuentoPreEnvio < umbralEnvioAplicable
      ? umbralEnvioAplicable - totalPostDescuentoPreEnvio
      : null

  // Total final si el minorista eligiera ese método — se muestra en $ dentro de cada botón
  function totalMinoristaConMetodo(metodo: string): number {
    const pct = metodo === 'transferencia' ? (reglas?.desc_transferencia_pct ?? 0) : 0
    const base = basePostVolumenCanal - Math.round(basePostVolumenCanal * pct / 100)
    const gratis = envioSeleccionado !== null && (
      (umbralAmba !== null && esAmbaEnvio && base >= umbralAmba) ||
      (umbralGeneral !== null && base >= umbralGeneral)
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
                {/* Desglose IVA — minoristas y guests: primero el precio con IVA
                    (es lo que pagan), abajo el valor sin impuestos como referencia */}
                {!esMayorista ? (
                  <>
                    <div className="flex justify-between" style={{ color: 'var(--color-acero-oscuro)' }}>
                      <span>Subtotal (IVA incluido)</span>
                      <span>{formatPrecio(totalGeneral)}</span>
                    </div>
                    <div className="flex justify-between" style={{ color: 'var(--color-acero-oscuro)' }}>
                      <span>Precio Bruto</span>
                      <span>{formatPrecio(totalSinIVA)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between" style={{ color: 'var(--color-acero-oscuro)' }}>
                      <span>Subtotal (IVA incluido)</span>
                      <span>{formatPrecio(totalConIvaMayorista)}</span>
                    </div>
                    <div className="flex justify-between" style={{ color: 'var(--color-acero-oscuro)' }}>
                      <span>Precio Bruto</span>
                      <span>{formatPrecio(totalGeneral)}</span>
                    </div>
                    {/* Al facturar sin IVA, el IVA se resta del precio de arranque como descuento */}
                    {!enConIva && descIvaMayorista > 0 && (
                      <div className="flex justify-between text-xs font-medium" style={{ color: '#16a34a' }}>
                        <span>Desc IVA</span>
                        <span>-{formatPrecio(descIvaMayorista)}</span>
                      </div>
                    )}
                  </>
                )}
                {envioSeleccionado && (
                  <div className="flex justify-between" style={{ color: 'var(--color-acero-oscuro)' }}>
                    <span>Envío</span>
                    {envioEsGratis
                      ? <span className="font-medium" style={{ color: '#16a34a' }}>Gratis</span>
                      : <span>{formatPrecio(costoEnvio)}</span>}
                  </div>
                )}
                {/* Con "Con IVA" el total ya incluye el IVA — no se muestra recargo en rojo */}
                {ajuste < 0 && (
                  <div className="flex justify-between text-xs font-medium" style={{ color: '#16a34a' }}>
                    <span>Desc. ({METODO_LABEL[metodoPago!] ?? metodoPago})</span>
                    <span>-{formatPrecio(Math.abs(ajuste))}</span>
                  </div>
                )}
                {ajusteVolumenCanal !== 0 && (
                  <div className="flex justify-between text-xs font-medium" style={{ color: '#16a34a' }}>
                    <span>Desc. por volumen ({descVolCanalPct}%)</span>
                    <span>-{formatPrecio(Math.abs(dispVolumenCanal))}</span>
                  </div>
                )}
                {ajusteAutogestion !== 0 && (
                  <div className="flex justify-between text-xs font-medium" style={{ color: '#16a34a' }}>
                    <span>Desc. web</span>
                    <span>-{formatPrecio(Math.abs(dispAutogestion))}</span>
                  </div>
                )}
                {ajusteTransfMinorista !== 0 && (
                  <div className="flex justify-between text-xs font-medium" style={{ color: '#16a34a' }}>
                    <span>Desc. transferencia ({descTransfPct}%)</span>
                    <span>-{formatPrecio(Math.abs(ajusteTransfMinorista))}</span>
                  </div>
                )}
                <div className="h-px my-1" style={{ background: 'var(--color-acero-claro)' }} />
                <div className="flex justify-between font-semibold text-lg" style={{ color: 'var(--foreground)' }}>
                  <span>Total</span>
                  <span>{formatPrecio(esMayorista ? totalFinal : totalConEnvio)}</span>
                </div>
                {!esMayorista && metodoPagoMinorista !== 'transferencia' && (
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
              seleccionada={envioSeleccionado ? { ...envioSeleccionado, costo: costoEnvio } : null}
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
                        <span className="text-sm flex-1" style={{ color: 'var(--foreground)' }}>{m.label}</span>
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
              {faltaParaDescVolumen !== null && (
                <div className="px-3 py-2 rounded-lg text-xs" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                  Te faltan {formatPrecio(faltaParaDescVolumen)} para el {descVolCanalPct}% de descuento por volumen.
                </div>
              )}

              {/* Botón Mercado Pago */}
              {metodoPagoMinorista === 'mercado_pago' && (
                <button
                  onClick={() => handlePagarMP()}
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

              {/* Botón Transferencia — sin adjuntar comprobante acá: se sube después, desde el detalle del pedido */}
              {metodoPagoMinorista === 'transferencia' && (
                <>
                  <button
                    onClick={handlePagarTransferencia}
                    disabled={pagando || hayProblemaStock || refreshingPrecios || !envioSeleccionado || minimoInsuficiente}
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
                href={`https://wa.me/${WA_NUMBER}?text=${buildWhatsAppMsg(items, metodoPagoMinorista, mostrarPrecios && totalConEnvio > 0 ? totalConEnvio : undefined, null, reglas?.whatsapp_tipo ?? 'bot')}`}
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

              {/* Toggle Con IVA / Sin IVA */}
              {(metodosConIva.length > 0 || metodosSinIva.length > 0) && (
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-acero-oscuro)' }}>
                    Tipo de facturación
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {metodosConIva.length > 0 && (
                      <label
                        className="flex flex-col items-center justify-center p-2.5 rounded-lg border cursor-pointer transition-colors"
                        style={{
                          borderColor: facturaIva === 'con' ? 'var(--color-granito-oscuro)' : 'var(--color-acero-claro)',
                          background:  facturaIva === 'con' ? 'var(--color-acero-brillo)' : 'white',
                        }}
                      >
                        <input type="radio" name="factura_iva" value="con" checked={facturaIva === 'con'}
                          onChange={() => { setFacturaIva('con'); setMetodoPago(null); setComprobantePath(null) }} className="sr-only" />
                        <span className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>Con IVA</span>
                        <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                          {mostrarPrecios && totalGeneral > 0 ? formatPrecio(totalBtnConIva) : 'Factura A'}
                        </span>
                      </label>
                    )}
                    {metodosSinIva.length > 0 && (
                      <label
                        className="flex flex-col items-center justify-center p-2.5 rounded-lg border cursor-pointer transition-colors"
                        style={{
                          borderColor: facturaIva === 'sin' ? 'var(--color-granito-oscuro)' : 'var(--color-acero-claro)',
                          background:  facturaIva === 'sin' ? 'var(--color-acero-brillo)' : 'white',
                        }}
                      >
                        <input type="radio" name="factura_iva" value="sin" checked={facturaIva === 'sin'}
                          onChange={() => { setFacturaIva('sin'); setMetodoPago(null); setComprobantePath(null) }} className="sr-only" />
                        <span className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>Sin IVA</span>
                        <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                          {mostrarPrecios && totalGeneral > 0 ? formatPrecio(totalBtnSinIva) : 'Precio base'}
                        </span>
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Métodos de pago filtrados por IVA */}
              {facturaIva && metodosActivosActuales.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-acero-oscuro)' }}>
                    Forma de pago
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {metodosActivosActuales.map(k => (
                      <label
                        key={k}
                        className="flex items-start gap-2.5 cursor-pointer px-3 py-2.5 rounded-lg border transition-colors"
                        style={{
                          borderColor: metodoPago === k ? 'var(--color-granito-oscuro)' : 'var(--color-acero-claro)',
                          background:  metodoPago === k ? 'var(--color-acero-brillo)' : 'white',
                        }}
                      >
                        <input type="radio" name="metodo_pago" value={k} checked={metodoPago === k}
                          onChange={() => { setMetodoPago(k); setComprobantePath(null) }} className="flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm" style={{ color: 'var(--foreground)' }}>
                            {METODO_LABEL[k] ?? k}
                          </span>
                          {k === 'transferencia_negro' && metodoPago === k && cbuSinIva && (
                            <span className="text-xs mt-0.5 block font-mono leading-relaxed" style={{ color: 'var(--color-acero-oscuro)' }}>
                              {tipoCuentaSinIva === 'deposito' ? (
                                <>
                                  {cuitSinIva && `CUIT: ${cuitSinIva}`}{cuitSinIva && bancoSinIva && ' · '}{bancoSinIva && `Banco: ${bancoSinIva}`}
                                  <br />CTA/CTE: {cbuSinIva}
                                </>
                              ) : (
                                <>{aliasSinIva && `Alias: ${aliasSinIva}`}{aliasSinIva && ' · '}{tipoCuentaSinIva}: {cbuSinIva}</>
                              )}
                            </span>
                          )}
                        </div>
                        {/* Total final del método en $ — verde cuando queda por debajo del precio con IVA */}
                        {mostrarPrecios && totalGeneral > 0 && (
                          <span
                            className="text-xs font-medium flex-shrink-0"
                            style={{ color: totalMayoristaConMetodo(k) < totalBtnConIva ? '#16a34a' : 'var(--foreground)' }}
                          >
                            {formatPrecio(totalMayoristaConMetodo(k))}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Aviso línea de crédito */}
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

              {/* Dirección de retiro */}
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
                  Te faltan {formatPrecio(reglas.minimo_compra - totalPostDescuentoPreEnvio)}.
                </div>
              )}

              {/* Aviso descuento por volumen cercano */}
              {faltaParaDescVolumen !== null && (
                <div className="px-3 py-2 rounded-lg text-xs" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                  Te faltan {formatPrecio(faltaParaDescVolumen)} para el {descVolCanalPct}% de descuento por volumen.
                </div>
              )}

              {/* Uploader de comprobante (mayorista, métodos que lo requieren) */}
              {facturaIva && metodoPago && METODOS_CON_COMPROBANTE.has(metodoPago) && (
                <UploaderComprobante
                  path={comprobantePath}
                  uploading={uploadingComp}
                  error={compError}
                  onFile={handleUploadComprobante}
                  onClear={() => { setComprobantePath(null); setCompError(null) }}
                />
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
                Pedir por WhatsApp
              </a>

              {errorPago && (
                <p className="text-xs text-center" style={{ color: '#ef4444' }}>{errorPago}</p>
              )}
            </div>
          ) : esGuest ? (
            // ── Comprador sin cuenta ────────────────────────────────────
            <>
              {!envioSeleccionado && (
                <p className="text-xs text-center" style={{ color: 'var(--color-acero-oscuro)' }}>
                  Calculá el envío para continuar.
                </p>
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
              {faltaParaDescVolumen !== null && (
                <div className="px-3 py-2 rounded-lg text-xs" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                  Te faltan {formatPrecio(faltaParaDescVolumen)} para el {descVolCanalPct}% de descuento por volumen.
                </div>
              )}

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
