/**
 * Colores y medidas de las variantes — helpers puros.
 *
 * Viven acá y no en ColorPicker porque ese archivo es `'use client'` y estos
 * helpers también los usa código de server (los mails de preventa). Importar un
 * módulo cliente desde el server arrastra sus componentes al bundle del server
 * sin necesidad.
 */

const COLOR_MAP: Record<string, string> = {
  NEGRO: '#1c1c1e',
  BLANCO: '#f0f0f0',
  VERDE: '#4ade80',
  ROSA: '#f472b6',
  AQUA: '#22d3ee',
  LILA: '#c084fc',
  ROJO: '#ef4444',
  AZUL: '#3b82f6',
  GRIS: '#9ca3af',
  CHAMPAGNE: '#f5deb3',
  ORO: '#eab308',
  VIOLETA: '#7c3aed',
  CELESTE: '#7dd3fc',
  NARANJA: '#f97316',
  BORRAVINO: '#7f1d1d',
  CHOCOLATE: '#78350f',
  MANTECA: '#fef9c3',
  ARENA: '#d4b483',
  'ROSÉ': '#fda4af',
  PLATEADO: '#cbd5e1',
  PLATA: '#cbd5e1',
  NATURAL: '#e5d5b0',
  CAMUFLADO: '#6b7280',
  'AZUL NOCHE': '#1e3a5f',
  'AZUL PERLADO': '#bfdbfe',
  'VERDE PINO': '#14532d',
  'AZUL GRISACEO': '#475569',
  'AZUL/PLATA': '#93c5fd',
  MADERA: '#92400e',
  'VERDE AGUA': '#34d399',
  'VERDE PP': '#4ade80',
  'NEGRO PP': '#1c1c1e',
  'BLANCO PP': '#f0f0f0',
  'ROSA PP': '#f472b6',
  'AQUA PP': '#22d3ee',
  'LILA PP': '#c084fc',
  'ROJO PP': '#ef4444',
  'AZUL PP': '#3b82f6',
  GRISPP: '#9ca3af',
  'AZUL NOCHE PP': '#1e3a5f',
  'PLATEADO PP': '#cbd5e1',
  'NYLON BLANCO PBT': '#f0f0f0',
}

export function getSwatchStyle(nombre: string): React.CSSProperties {
  const upper = nombre.toUpperCase()
  if (upper.includes('SURTIDO')) {
    return {
      background: 'linear-gradient(135deg, #ef4444 0%, #f97316 16%, #eab308 33%, #4ade80 50%, #3b82f6 66%, #c084fc 83%, #f472b6 100%)',
    }
  }
  const color = COLOR_MAP[upper] ?? resolveByPrefix(upper) ?? '#cbd5e1'
  return { background: color }
}

function resolveByPrefix(upper: string): string | null {
  for (const key of Object.keys(COLOR_MAP)) {
    if (upper.startsWith(key + ' ') || upper.startsWith(key + ',')) return COLOR_MAP[key]
  }
  return null
}

export function capitalizeVariante(s: string) {
  if (s.toUpperCase().includes('SURTIDO')) return 'Varios colores'
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

// Variantes que expresan una medida (ej. bombillas: "15CM", "20 CM") en vez de un color.
export function esMedida(nombre: string): boolean {
  return /\d/.test(nombre)
}
