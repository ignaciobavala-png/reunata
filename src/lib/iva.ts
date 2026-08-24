/**
 * IVA — fuente única de verdad.
 *
 * TODAS las listas de precios que llegan desde Gesu vienen con el IVA YA
 * INCLUIDO. Confirmado con el tester el 2026-08-24 sobre el producto BT1/2:
 *
 *     precio_lista3 (mayorista) = USD 0,70  → ese 0,70 YA tiene IVA
 *     sin IVA = 0,70 / 1,21 = USD 0,5785
 *
 * Vale para lista3 (mayorista) y lista5 (minorista/consumidor final) por igual.
 * El campo que manda Gesu se llama `precioFinalListaN`: es el precio final.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  REGLA: el IVA NUNCA se suma. Solo se DESPEJA para mostrarlo por separado.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Este bug ya apareció dos veces (2026-07-14 en lista5, 2026-08-24 en lista3)
 * porque la regla estaba reescrita a mano en cuatro lugares con criterios
 * distintos: por lista en la vitrina, por slug de canal en el carrito, por
 * lista en el server, y un helper que nadie llamaba. Si necesitás saber si un
 * precio incluye IVA, importá de acá — no lo derives del canal ni de la lista.
 */

/** Alícuota por defecto cuando el producto no la trae de Gesu. */
export const IVA_PCT_DEFAULT = 21

/** Fracción de IVA del producto (0,21), tolerante a null. */
export function ivaRate(ivaPct?: number | null): number {
  return (ivaPct ?? IVA_PCT_DEFAULT) / 100
}

/**
 * Neto despejado de un precio que ya incluye IVA.
 * Es la ÚNICA operación de IVA permitida sobre un precio de lista.
 */
export function netoDesdeBruto(precioConIva: number, ivaPct?: number | null): number {
  return Math.round(precioConIva / (1 + ivaRate(ivaPct)))
}

/** Config de ajustes por forma de pago (subconjunto de canales_config). */
export type ConfigAjustePago = {
  desc_efectivo_pct?: number | null
  desc_transferencia_pct?: number | null
}

/**
 * Ajuste porcentual por forma de pago. Negativo = descuento.
 *
 * Los métodos "con Factura A" (transferencia_blanco, e-cheq, cheque) NO llevan
 * ajuste: su 21% era el IVA, y el IVA ya está en el precio de lista. Si el
 * negocio quiere que pagar sin factura salga más barato, eso se carga como
 * descuento en los métodos sin factura (`desc_transferencia_pct`,
 * `desc_efectivo_pct`), no como recargo en los métodos con factura.
 */
export function pctAjusteMetodoPago(metodo: string | null | undefined, cfg: ConfigAjustePago | null | undefined): number {
  if (!metodo || !cfg) return 0
  if (metodo === 'efectivo')            return -(cfg.desc_efectivo_pct ?? 0)
  if (metodo === 'transferencia_negro') return -(cfg.desc_transferencia_pct ?? 0)
  if (metodo === 'transferencia')       return -(cfg.desc_transferencia_pct ?? 0)
  return 0
}

/**
 * Monto del ajuste por forma de pago sobre una base. Negativo = descuento.
 * Lo usan el carrito y el server para no divergir: cuando cada lado hacía su
 * propia cuenta, el carrito mostraba un total con recargo del 21% en e-cheq y
 * el pedido se guardaba sin él.
 */
export function ajusteMetodoPago(base: number, metodo: string | null | undefined, cfg: ConfigAjustePago | null | undefined): number {
  const pct = pctAjusteMetodoPago(metodo, cfg)
  return pct === 0 ? 0 : Math.round(base * pct / 100)
}
