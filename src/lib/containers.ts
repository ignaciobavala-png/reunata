/**
 * Containers — preventa de mercadería importada, por etapa del viaje.
 *
 * Un "container" es un viaje: una subcuenta de GESU con stock independizado que
 * tiene los mismos códigos de artículo que la cuenta principal. El cliente ve la
 * MISMA card del catálogo; lo que cambia es cuándo llega y a qué precio. Por eso
 * el acceso es un botón "¿Cuándo viene?" en la card y no una sección aparte con
 * el catálogo duplicado.
 *
 * La etapa la avanza una persona desde el panel: las fechas son estimaciones que
 * se muestran, nunca disparadores. Si el barco se demora, el sistema no puede
 * decir "llegó" por su cuenta.
 */

export type EtapaContainer =
  | 'borrador'
  | 'china'
  | 'oceano'
  | 'puerto'
  | 'cerrado'
  | 'cancelado'

/** Etapas en las que se puede reservar. */
export const ETAPAS_ABIERTAS: EtapaContainer[] = ['china', 'oceano']

/** Etapas que el cliente ve. Puerto se muestra pero es de solo lectura. */
export const ETAPAS_VISIBLES: EtapaContainer[] = ['china', 'oceano', 'puerto']

export const ETAPA_LABEL: Record<EtapaContainer, string> = {
  borrador:  'Borrador',
  china:     'Armando en China',
  oceano:    'En el océano',
  puerto:    'En el puerto',
  cerrado:   'Viaje cerrado',
  cancelado: 'Cancelado',
}

/** Qué significa la etapa para el cliente, en una línea. */
export const ETAPA_AYUDA: Record<EtapaContainer, string> = {
  borrador:  'Todavía no se publicó.',
  china:     'Se está armando el pedido. Es el mejor precio y el plazo más largo.',
  oceano:    'Ya salió el barco. Queda solo lo que se cargó.',
  puerto:    'Llegó a la Argentina y está en aduana. No se puede reservar hasta que se libere.',
  cerrado:   'El viaje terminó. La mercadería ya pasó a stock normal.',
  cancelado: 'El viaje se canceló.',
}

export const ETAPA_COLOR: Record<EtapaContainer, string> = {
  borrador:  '#9ca3af',
  china:     '#f59e0b',
  oceano:    '#0ea5e9',
  puerto:    '#8b5cf6',
  cerrado:   '#6b7280',
  cancelado: '#ef4444',
}

export function aceptaReservas(etapa: EtapaContainer): boolean {
  return ETAPAS_ABIERTAS.includes(etapa)
}

export interface ContainerDescuentos {
  etapa: EtapaContainer
  descuento_china: number
  descuento_oceano: number
}

/**
 * Descuento vigente del viaje. Escalonado, no continuo: el cliente ve el mismo
 * precio cada vez que entra, y una demora del barco no cambia el precio de algo
 * ya reservado. Puerto no descuenta — es precio de lista.
 */
export function descuentoVigente(c: ContainerDescuentos): number {
  if (c.etapa === 'china')  return Number(c.descuento_china)  || 0
  if (c.etapa === 'oceano') return Number(c.descuento_oceano) || 0
  return 0
}

/**
 * Precio con el descuento de etapa aplicado.
 *
 * Se aplica sobre el precio de lista del canal del cliente, que YA incluye IVA
 * (ver src/lib/iva.ts). Acá no se suma ni se despeja nada: solo se descuenta.
 */
export function precioConDescuento(precioLista: number, descuentoPct: number): number {
  if (!descuentoPct) return Math.round(precioLista)
  return Math.round(precioLista * (1 - descuentoPct / 100))
}

/** Días que faltan para una fecha estimada. Negativo = ya pasó. */
export function diasHasta(fecha: string | null | undefined): number | null {
  if (!fecha) return null
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const destino = new Date(`${fecha}T00:00:00`)
  if (isNaN(destino.getTime())) return null
  return Math.round((destino.getTime() - hoy.getTime()) / 86_400_000)
}

/** "15/11/2026". Se parsea con hora local para que no reste un día por UTC. */
export function formatFechaEstimada(fecha: string | null | undefined): string | null {
  if (!fecha) return null
  const d = new Date(`${fecha}T00:00:00`)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Texto corto para el badge de la card: "60 d", "2 meses", "En puerto". */
export function etiquetaLlegada(etapa: EtapaContainer, fechaArribo: string | null | undefined): string {
  if (etapa === 'puerto') return 'En puerto'
  const dias = diasHasta(fechaArribo)
  if (dias === null) return 'Por venir'
  if (dias <= 0) return 'Llegando'
  if (dias < 45) return `${dias} d`
  return `${Math.round(dias / 30)} meses`
}

// ---------------------------------------------------------------------------
// Formas que viajan entre el server y el cliente
// ---------------------------------------------------------------------------

export interface ColorDisponible {
  itemId: number
  /** null = el producto no tiene variantes. */
  variante: string | null
  disponible: number
  precio: number
  precioLista: number
  neto: number
  /** Neto del precio de lista sin descuento — para el tachado del mayorista. */
  netoLista: number
}

export interface ViajeDisponible {
  containerId: string
  nombre: string
  etapa: EtapaContainer
  fechaArribo: string | null
  descuentoPct: number
  aceptaReservas: boolean
  moneda: string | null
  /** Bulto mínimo del canal (producto_canales.multiplo). Se reserva de a múltiplos. */
  multiplo: number
  colores: ColorDisponible[]
}

/** codigo_interno → viajes que lo traen. */
export type DisponibilidadPorCodigo = Record<string, ViajeDisponible[]>
