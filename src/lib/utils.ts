import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function aplicarTipoCambio(
  precio: number | null,
  moneda: string | null,
  tipoCambio: number
): { precio: number | null; moneda: string | null } {
  if (precio === null) return { precio: null, moneda: null }
  const esUsd = moneda === 'u$s' || moneda === 'USD'
  if (esUsd && tipoCambio > 0) {
    return { precio: Math.round(precio * tipoCambio), moneda: null }
  }
  return { precio, moneda }
}

export function formatPrecio(n: number, moneda?: string | null): string {
  const esUsd = moneda === 'u$s' || moneda === 'USD'
  if (esUsd) {
    return 'USD ' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return '$ ' + n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
