/**
 * Número y links de WhatsApp — fuente única.
 *
 * El bug que motivó este archivo: `PagoInstrucciones` armaba el link como
 * `https://wa.me/549${cfg['whatsapp_ventas']}`, y esa clave se inserta vacía en
 * la migración `20260418000005_whatsapp_config.sql` y no había forma de
 * editarla desde el panel. Resultado: `https://wa.me/549?text=...`, que WhatsApp
 * responde con "el número no es válido" — no abre el chat y descarta el texto.
 *
 * Reglas:
 * - Nunca concatenar prefijos a mano: usar `normalizarWhatsApp()`.
 * - Si la config está vacía o es inválida, se cae al número oficial.
 */

/** Número oficial de Reunata: +54 9 11 3272-0974 */
export const WHATSAPP_NUMERO = '5491132720974'

/**
 * Lleva cualquier formato razonable al E.164 sin `+` que espera wa.me.
 * Acepta "11 3272-0974", "011 15 3272-0974", "+54 9 11 3272 0974", etc.
 * Devuelve null si no queda un número plausible.
 */
export function normalizarWhatsApp(valor?: string | null): string | null {
  let d = (valor ?? '').replace(/\D/g, '')
  if (!d) return null

  if (d.startsWith('54')) {
    d = d.slice(2)
    if (d.startsWith('9')) d = d.slice(1)
  }
  // Formato local: 011 15 3272-0974 → 11 3272-0974
  if (d.startsWith('0')) d = d.slice(1)
  if (d.length > 10 && d.startsWith('15')) d = d.slice(2)

  // Un móvil argentino sin 0 ni 15 tiene 10 dígitos (área + abonado)
  if (d.length < 10 || d.length > 11) return null
  return `549${d}`
}

/** Número listo para wa.me, con fallback al oficial. */
export function whatsappNumero(valor?: string | null): string {
  return normalizarWhatsApp(valor) ?? WHATSAPP_NUMERO
}

/** Link de wa.me con el texto ya codificado. */
export function whatsappLink(texto?: string, valor?: string | null): string {
  const base = `https://wa.me/${whatsappNumero(valor)}`
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base
}
