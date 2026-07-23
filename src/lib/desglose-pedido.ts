export interface LineaAjustePedido {
  label: string
  monto: number // negativo = descuento, positivo = IVA
  esIva: boolean
}

// Reconstruye el desglose de un pedido a partir de descuento_nota (ej. "Desc. Web 10%,
// Desc. Vol 5%, Recargo transf. banco 21%"). El orden de los pasos es siempre
// Web → Volumen → método de pago (ver actions/pedidos.ts), cada uno aplicado sobre
// el saldo del paso anterior — misma cascada que se usó al calcular el pedido real.
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

  let base = subtotalItems
  const lineas: LineaAjustePedido[] = []

  if (parseadas.web) {
    const monto = -Math.round(base * parseadas.web.pct / 100)
    base += monto
    lineas.push({ label: 'Descuento Web', monto, esIva: false })
  }
  if (parseadas.vol) {
    const monto = -Math.round(base * parseadas.vol.pct / 100)
    base += monto
    lineas.push({ label: 'Descuento por volumen', monto, esIva: false })
  }
  if (parseadas.metodo) {
    const { esRecargo, middle, pct } = parseadas.metodo
    const monto = esRecargo ? Math.round(base * pct / 100) : -Math.round(base * pct / 100)
    base += monto
    lineas.push({
      label: esRecargo ? `IVA (${middle})` : `Descuento (${middle})`,
      monto,
      esIva: esRecargo,
    })
  }

  return lineas
}
