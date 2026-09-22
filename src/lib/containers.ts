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

import { aplicarDescuento } from '@/lib/precio-efectivo'

export type EtapaContainer =
  | 'borrador'
  | 'china'
  | 'oceano'
  | 'puerto'
  | 'deposito'
  | 'cerrado'
  | 'cancelado'

/** Etapas en las que se puede reservar. */
export const ETAPAS_ABIERTAS: EtapaContainer[] = ['china', 'oceano']

/**
 * Etapas que el cliente ve en el panel del producto.
 *
 * Nacionalizado (puerto) VOLVIÓ a estar adentro (22/09/2026, devolución del
 * tester): aduana liberada no es lo mismo que mercadería en el depósito, así que
 * no hay entrega inmediata todavía y el cliente tiene que seguir viendo que es
 * preventa. Quien marca la llegada real es "deposito" — una etapa nueva, a mano,
 * para el día que Elena carga la unidad en la cuenta principal (ver
 * `containers-modelo-subcuentas-gesu`). Recién ahí sale de este panel y pasa a
 * ser exactamente la fila "Precio web" del catálogo normal.
 */
export const ETAPAS_VISIBLES: EtapaContainer[] = ['china', 'oceano', 'puerto']

// Las claves de la etapa son las del diseño original (china/oceano/puerto); los
// nombres son los que usa el equipo de Reunata para hablar del viaje. No se
// renombró el enum en la base para no migrar datos por una cuestión de texto.
export const ETAPA_LABEL: Record<EtapaContainer, string> = {
  borrador:  'Borrador',
  china:     'Armando el contenedor',
  oceano:    'En viaje',
  puerto:    'Nacionalizado',
  deposito:  'Recibido en depósito',
  cerrado:   'Viaje cerrado',
  cancelado: 'Cancelado',
}

/** Qué significa la etapa para el cliente, en una línea. */
export const ETAPA_AYUDA: Record<EtapaContainer, string> = {
  borrador:  'Todavía no se publicó.',
  china:     'Se está armando el pedido. Es el mejor precio y el plazo más largo.',
  oceano:    'Fabricación y viaje del barco. El precio sube un poco cada día hasta llegar al de la web.',
  puerto:    'Aduana liberada, viene en camino al depósito. Ya se vende al precio de la web, pero todavía sin entrega inmediata.',
  deposito:  'Llegó al depósito: pasa a stock normal, con entrega inmediata.',
  cerrado:   'El viaje se archivó.',
  cancelado: 'El viaje se canceló.',
}

export const ETAPA_COLOR: Record<EtapaContainer, string> = {
  borrador:  '#9ca3af',
  china:     '#f59e0b',
  oceano:    '#0ea5e9',
  puerto:    '#8b5cf6',
  deposito:  '#22c55e',
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
  oceano_desde?: string | null
  oceano_dias?: number | null
}

/** Columnas del viaje que necesita `descuentoVigente`. Para no olvidar ninguna en un select. */
export const COLUMNAS_DESCUENTO = 'etapa, descuento_china, descuento_oceano, oceano_desde, oceano_dias'

/**
 * Hoy en hora argentina, como 'YYYY-MM-DD'.
 *
 * El escalón del precio cambia a la medianoche de acá, no a la de Londres: en
 * Vercel el server corre en UTC y con `new Date()` a secas el precio subiría a las
 * 21:00 del día anterior. La base hace la misma cuenta con `now() at time zone
 * 'America/Argentina/Buenos_Aires'`.
 */
export function hoyArgentina(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

/** Días enteros entre dos fechas 'YYYY-MM-DD'. */
function diasEntre(desde: string, hasta: string): number {
  const a = Date.parse(`${desde}T00:00:00Z`)
  const b = Date.parse(`${hasta}T00:00:00Z`)
  if (isNaN(a) || isNaN(b)) return 0
  return Math.round((b - a) / 86_400_000)
}

/**
 * Descuento vigente del viaje.
 *
 * "Armando el contenedor" es un % fijo: el mejor precio, el mismo todos los días.
 *
 * "En viaje" es una rampa. Arranca en `descuento_oceano` y baja hasta 0 —el precio
 * de la web— a lo largo de los días que faltaban para el arribo el día en que una
 * persona apretó el botón. Son muchos escalones chicos: con 18% y 90 días de
 * viaje, 0,2 puntos por día.
 *
 * La rampa se mide contra `oceano_desde` + `oceano_dias` congelados y NO contra
 * `fecha_arribo_est` en vivo: si el barco se demora y alguien corre la fecha, una
 * rampa en vivo se estiraría y el precio bajaría, con lo cual el que compró ayer
 * habría pagado más que el que compra hoy. Congelada, el descuento llega a 0 y se
 * queda en precio web hasta que la persona pase el viaje a nacionalizado. El
 * precio nunca vuelve atrás — que es lo único que no se puede deshacer.
 *
 * Sin rampa cargada (viaje viejo, o sin fecha de arribo) se comporta como antes:
 * el % fijo de la etapa.
 *
 * Nacionalizado y cerrado no descuentan: es precio de lista.
 *
 * Espejo de `container_descuento_vigente()` en la base, que lo necesita para
 * congelar el descuento de la reserva. Las dos se mueven juntas.
 */
export function descuentoVigente(c: ContainerDescuentos, hoy = hoyArgentina()): number {
  if (c.etapa === 'china') return Number(c.descuento_china) || 0
  if (c.etapa !== 'oceano') return 0

  const inicial = Number(c.descuento_oceano) || 0
  const dias = Number(c.oceano_dias)
  if (inicial <= 0) return 0
  if (!c.oceano_desde || !Number.isFinite(dias) || dias <= 0) return inicial

  const pasados = diasEntre(c.oceano_desde, hoy)
  if (pasados <= 0) return inicial
  if (pasados >= dias) return 0
  return Math.round(inicial * (1 - pasados / dias) * 100) / 100
}

/** Cuántos puntos de descuento pierde por día la etapa "En viaje". Para el panel. */
export function pasoDiario(c: ContainerDescuentos): number | null {
  if (!c.oceano_dias || c.oceano_dias <= 0) return null
  const inicial = Number(c.descuento_oceano) || 0
  if (inicial <= 0) return null
  return Math.round((inicial / c.oceano_dias) * 100) / 100
}

/**
 * Precio con el descuento de etapa aplicado.
 *
 * Se aplica sobre el precio de lista del canal del cliente, que YA incluye IVA
 * (ver src/lib/iva.ts). Acá no se suma ni se despeja nada: solo se descuenta.
 *
 * Delega en `aplicarDescuento` para que el redondeo viva en un solo lugar: desde
 * que la preventa entra al carrito, el mismo descuento se calcula también en
 * pedidos.ts, y dos redondeos distintos harían que el carrito muestre un precio
 * y el pedido guarde otro.
 */
export const precioConDescuento = aplicarDescuento

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

/** "Octubre". Mes de arribo, para el resumen de precio de la card. */
export function formatMesArribo(fecha: string | null | undefined): string | null {
  if (!fecha) return null
  const d = new Date(`${fecha}T00:00:00`)
  if (isNaN(d.getTime())) return null
  const mes = d.toLocaleDateString('es-AR', { month: 'long' })
  return mes.charAt(0).toUpperCase() + mes.slice(1)
}

/** Texto corto para el badge de la card: "60 d", "2 meses", "Nacionalizado". */
export function etiquetaLlegada(etapa: EtapaContainer, fechaArribo: string | null | undefined): string {
  if (etapa === 'puerto') return 'Nacionalizado'
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
  /** Producto de la tienda con el que se muestra. Lo necesita el carrito. */
  productoId: number
  codigoInterno: string
  etapa: EtapaContainer
  fechaArribo: string | null
  descuentoPct: number
  /** Puntos de descuento que se pierden por día. null = etapa sin rampa. */
  pasoDiarioPct: number | null
  aceptaReservas: boolean
  moneda: string | null
  /** Bulto mínimo del canal (producto_canales.multiplo). Se reserva de a múltiplos. */
  multiplo: number
  colores: ColorDisponible[]
  /**
   * true = el que pide esto no tiene `puede_containers()`. Ve que el viaje existe
   * (badge, fecha) pero no precios ni cantidades — `colores` viene vacío a
   * propósito. Pedido del tester (22/09/2026): todos ven que algo viene, y al
   * tocar reciben la invitación a pedir acceso a Reunata Importa en vez del panel
   * de compra.
   */
  requiereAcceso?: boolean
}

/** codigo_interno → viajes que lo traen. */
export type DisponibilidadPorCodigo = Record<string, ViajeDisponible[]>

/**
 * La opción de stock: precio de la web, entrega inmediata.
 *
 * Viaja con la disponibilidad de preventa porque el panel las muestra juntas, en
 * la misma lista y con el mismo botón. El cliente no elige "web o preventa": elige
 * cuándo lo quiere.
 */
export interface TiendaDisponible {
  productoId: number
  precio: number
  neto: number
  multiplo: number
  colores: { variante: string | null; stock: number | null }[]
}

/** codigo_interno → la opción de stock de ese producto. */
export type TiendaPorCodigo = Record<string, TiendaDisponible>

/**
 * Cómo se le anuncia la demora al cliente en una línea del carrito o del pedido.
 *
 * Pedido explícito de Gastón (14/09/2026): "lo único que tenemos que diferenciar
 * es la demora en cada producto" y "que quede claro que le va a llegar
 * aproximadamente en la fecha de llegada". Por eso la palabra "aproximadamente"
 * está siempre y la fecha nunca se muestra sola: una fecha pelada se lee como
 * compromiso, y el barco no la firma.
 */
export function textoDemora(fechaEstimada: string | null | undefined): string {
  const fecha = formatFechaEstimada(fechaEstimada)
  return fecha ? `Llega aprox. el ${fecha}` : 'Llega con el barco — fecha a confirmar'
}
