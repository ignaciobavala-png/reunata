// Descuento por volumen escalonado (hasta 3 tramos por canal).
// Fuente única del criterio de resolución: la usan el carrito (client),
// checkout.ts (MP y transferencia) y pedidos.ts (recompra) para que el
// monto mostrado y el cobrado coincidan siempre.

export type TramoVolumen = { montoMin: number; pct: number }

export type ConfigVolumen = {
  desc_volumen_monto_min?: number | null
  desc_volumen_pct?: number | null
  desc_volumen_monto_min_2?: number | null
  desc_volumen_pct_2?: number | null
  desc_volumen_monto_min_3?: number | null
  desc_volumen_pct_3?: number | null
}

// Tramos completos (monto y % cargados), ordenados por umbral ascendente
export function tramosVolumen(cfg: ConfigVolumen | null | undefined): TramoVolumen[] {
  if (!cfg) return []
  const pares: [number | null | undefined, number | null | undefined][] = [
    [cfg.desc_volumen_monto_min, cfg.desc_volumen_pct],
    [cfg.desc_volumen_monto_min_2, cfg.desc_volumen_pct_2],
    [cfg.desc_volumen_monto_min_3, cfg.desc_volumen_pct_3],
  ]
  return pares
    .filter((p): p is [number, number] => p[0] != null && p[1] != null && p[1] > 0)
    .map(([montoMin, pct]) => ({ montoMin, pct }))
    .sort((a, b) => a.montoMin - b.montoMin)
}

// El tramo más alto que el total ya superó, o null si no alcanza ninguno
export function resolverTramoVolumen(cfg: ConfigVolumen | null | undefined, total: number): TramoVolumen | null {
  const alcanzados = tramosVolumen(cfg).filter(t => total >= t.montoMin)
  return alcanzados.length > 0 ? alcanzados[alcanzados.length - 1] : null
}

// Tramos que el total todavía no alcanzó, para el mensaje progresivo del carrito
export function tramosPendientes(cfg: ConfigVolumen | null | undefined, total: number): TramoVolumen[] {
  return tramosVolumen(cfg).filter(t => total < t.montoMin)
}

// Validación de forma para el guardado desde el admin (espeja los CHECK de la DB).
// Devuelve un mensaje de error legible, o null si está todo bien.
export function validarTramosVolumen(cfg: ConfigVolumen): string | null {
  const pares = [
    { min: cfg.desc_volumen_monto_min, pct: cfg.desc_volumen_pct, n: 1 },
    { min: cfg.desc_volumen_monto_min_2, pct: cfg.desc_volumen_pct_2, n: 2 },
    { min: cfg.desc_volumen_monto_min_3, pct: cfg.desc_volumen_pct_3, n: 3 },
  ]
  for (const p of pares) {
    if ((p.min != null) !== (p.pct != null)) {
      return `Descuento por volumen (instancia ${p.n}): completá el monto mínimo y el porcentaje, o dejá ambos vacíos.`
    }
  }
  for (let i = 1; i < pares.length; i++) {
    if (pares[i].min != null && pares[i - 1].min == null) {
      return `Descuento por volumen: cargá la instancia ${pares[i - 1].n} antes que la ${pares[i].n}.`
    }
    if (pares[i].min != null && pares[i - 1].min != null && pares[i].min! <= pares[i - 1].min!) {
      return `Descuento por volumen: el monto de la instancia ${pares[i].n} debe ser mayor al de la instancia ${pares[i - 1].n}.`
    }
  }
  return null
}
