export interface LineaAjustePedido {
  label: string
  monto: number // negativo = descuento, positivo = IVA
  esIva: boolean
}

// Los % que vienen de la config del canal suelen ser enteros ("1%", "10%") y así los
// escribe el tester; solo el % efectivo combinado necesita decimales.
function formatPct(pct: number): string {
  return pct.toLocaleString('es-AR', { maximumFractionDigits: 2 })
}

function formatPctExacto(pct: number): string {
  return pct.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Reconstruye el desglose de un pedido a partir de descuento_nota (ej. "Desc. Web 10%,
// Desc. Vol 5%, Recargo transf. banco 21%").
//
// Presentación pedida por el tester (2026-07-22): el IVA va aparte, calculado sobre el
// subtotal de productos, y TODOS los descuentos se consolidan en una sola línea
// "Descuento total" con el % efectivo combinado. Nada de "Recargo": el recargo por
// factura A es IVA, no un cargo extra.
//
//   Subtotal productos                                  $468.720
//   IVA (21%)                                           +$98.431
//   Descuento total (Desc. Web 1%, Desc. Vol 10%) −10,90%  −$61.819
//   Total                                               $505.332
//
// El monto del descuento se despeja del total real guardado (subtotal + ajusteReal) en
// vez de recalcular la cascada: así las líneas siempre suman el Total, sin arrastrar el
// redondeo paso a paso. Matemáticamente da lo mismo — 0,99 × 0,90 × 1,21 es conmutativo.
export function desglosarAjustePedido(
  subtotalItems: number,
  descuentoNota: string | null | undefined,
  ajusteReal: number
): LineaAjustePedido[] {
  if (ajusteReal === 0) return []

  if (!descuentoNota) {
    // Sin nota no sabemos si es IVA o descuento: etiqueta neutra, sin la palabra "Recargo".
    return [{ label: 'Ajuste', monto: ajusteReal, esIva: false }]
  }

  const partes = descuentoNota.split(',').map(p => p.trim())
  type Parte = { esRecargo: boolean; middle: string; pct: number }
  const parseadas: Partial<Record<'web' | 'vol' | 'metodo', Parte>> = {}

  for (const parte of partes) {
    const m = parte.match(/^(Desc\.|Recargo)\s+(.+?)\s+([\d.,]+)%$/)
    if (!m) continue
    const [, prefijo, middle, pctStr] = m
    const pct = parseFloat(pctStr.replace(',', '.'))
    if (!Number.isFinite(pct)) continue
    const p: Parte = { esRecargo: prefijo === 'Recargo', middle, pct }
    if (middle === 'Web') parseadas.web = p
    else if (middle === 'Vol') parseadas.vol = p
    else parseadas.metodo = p
  }

  if (!parseadas.web && !parseadas.vol && !parseadas.metodo) {
    return [{ label: 'Ajuste', monto: ajusteReal, esIva: false }]
  }

  const lineas: LineaAjustePedido[] = []

  // El único "recargo" posible es el IVA de la factura A, y se muestra sobre el subtotal
  // de productos — no sobre la base ya descontada.
  const parteIva = parseadas.metodo?.esRecargo ? parseadas.metodo : null
  const iva = parteIva ? Math.round(subtotalItems * parteIva.pct / 100) : 0
  if (iva !== 0) {
    lineas.push({ label: `IVA (${formatPct(parteIva!.pct)}%)`, monto: iva, esIva: true })
  }

  // Descuento consolidado: lo que falta para llegar del (subtotal + IVA) al total real.
  const descuentoTotal = iva - ajusteReal
  if (descuentoTotal > 0) {
    const componentes = [
      parseadas.web && `Desc. Web ${formatPct(parseadas.web.pct)}%`,
      parseadas.vol && `Desc. Vol ${formatPct(parseadas.vol.pct)}%`,
      parseadas.metodo && !parseadas.metodo.esRecargo
        ? `Desc. ${parseadas.metodo.middle} ${formatPct(parseadas.metodo.pct)}%`
        : null,
    ].filter(Boolean) as string[]

    const base = subtotalItems + iva
    const pctEfectivo = base > 0 ? (descuentoTotal / base) * 100 : 0
    const detalle = componentes.length ? ` (${componentes.join(', ')})` : ''

    lineas.push({
      label: `Descuento total${detalle} −${formatPctExacto(pctEfectivo)}%`,
      monto: -descuentoTotal,
      esIva: false,
    })
  } else if (descuentoTotal < 0 && iva === 0) {
    // Caso raro: la nota no describe un IVA pero el pedido terminó más caro.
    lineas.push({ label: 'Ajuste', monto: ajusteReal, esIva: false })
  }

  return lineas
}
