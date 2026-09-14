// Precio efectivo de una línea de preventa — un solo lugar.
//
// Gastón, 14/09/2026: los descuentos se acumulan TODOS. Al descuento de etapa
// del viaje (que es el margen de financiación del importador, no un descuento
// comercial) se le suma después la cascada del pedido: web → volumen → forma de
// pago. Para un distribuidor en etapa China eso da del orden de −35% sobre lista.
//
// Esto existe por dos razones:
//
// 1. Para que ese número se pueda MIRAR. La cascada del pedido se aplica sobre
//    totales (ver pedidos.ts) y el descuento de etapa sobre la línea: sin un
//    helper que los junte, nadie sabe a cuánto terminó saliendo el mate hasta que
//    el pedido está escrito.
// 2. Para que haya un piso. `canales_config.piso_descuento_pct` es el descuento
//    total máximo que una línea de preventa puede acumular. Viene en null (sin
//    tope), que es exactamente lo que Gastón pidió — la red está apagada hasta
//    que alguien decida encenderla.
//
// El piso se aplica recortando el descuento DE ETAPA, nunca la cascada: la
// cascada es la misma para todas las líneas del pedido y tocarla en una sola
// haría que el total dejara de cerrar contra el desglose.

export interface ConfigPiso {
  piso_descuento_pct?: number | null
}

/**
 * Combina descuentos multiplicativos y devuelve el % total resultante.
 * combinarDescuentos(10, 5) = 14.5, no 15 — cada uno se aplica sobre el saldo
 * del anterior, igual que la cascada de pedidos.ts.
 */
export function combinarDescuentos(...pcts: number[]): number {
  const factor = pcts.reduce((acc, p) => acc * (1 - (p || 0) / 100), 1)
  return (1 - factor) * 100
}

/**
 * El descuento de etapa que se puede aplicar sin que la línea perfore el piso.
 *
 * `pctCascada` es el descuento combinado del pedido (web + volumen + forma de
 * pago). Si etapa + cascada supera el piso, se recorta la etapa hasta que el
 * combinado dé justo el piso. Si la cascada sola ya lo supera, la etapa queda en
 * 0: el piso no puede devolver plata que la cascada ya regaló.
 */
export function descuentoEtapaConPiso(
  descuentoEtapaPct: number,
  pctCascada: number,
  cfg: ConfigPiso | null | undefined,
): number {
  const piso = cfg?.piso_descuento_pct
  if (piso == null) return descuentoEtapaPct

  const combinado = combinarDescuentos(descuentoEtapaPct, pctCascada)
  if (combinado <= piso) return descuentoEtapaPct

  // Despejar la etapa del combinado: (1−e)(1−c) = (1−piso)
  const restante = (1 - piso / 100) / (1 - pctCascada / 100)
  if (restante >= 1) return 0
  return Math.max(0, Math.round((1 - restante) * 10000) / 100)
}

/** Precio con el descuento de etapa aplicado. Redondea al peso. */
export function aplicarDescuento(precioLista: number, descuentoPct: number): number {
  if (!descuentoPct) return Math.round(precioLista)
  return Math.round(precioLista * (1 - descuentoPct / 100))
}
