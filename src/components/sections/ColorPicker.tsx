'use client'

export interface Variante {
  nombre: string
  stock: number
}

interface Props {
  variantes: Variante[]
  selected: string | null
  onSelect: (nombre: string) => void
}

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

function getSwatchStyle(nombre: string): React.CSSProperties {
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

function capitalize(s: string) {
  if (s.toUpperCase().includes('SURTIDO')) return 'Varios colores'
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

export function ColorPicker({ variantes, selected, onSelect }: Props) {
  if (!variantes || variantes.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
        Color:{' '}
        {selected && (
          <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>
            {capitalize(selected)}
          </span>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        {variantes.map(v => {
          const sinStock = v.stock <= 0
          const isSelected = selected === v.nombre
          return (
            <button
              key={v.nombre}
              onClick={() => !sinStock && onSelect(v.nombre)}
              disabled={sinStock}
              title={`${capitalize(v.nombre)}${sinStock ? ' — Sin stock' : ''}`}
              aria-label={`${capitalize(v.nombre)}${sinStock ? ', sin stock' : ''}`}
              aria-pressed={isSelected}
              className="relative rounded transition-transform disabled:cursor-not-allowed"
              style={{
                width: 28,
                height: 28,
                ...getSwatchStyle(v.nombre),
                opacity: sinStock ? 0.5 : 1,
                outline: isSelected ? '2px solid var(--foreground)' : '2px solid transparent',
                outlineOffset: 2,
                border: '1px solid rgba(0,0,0,0.12)',
              }}
            >
              {sinStock && (
                <span className="absolute inset-0 overflow-hidden rounded" aria-hidden="true">
                  <span
                    className="absolute"
                    style={{
                      width: '140%',
                      height: 1.5,
                      background: 'rgba(255,255,255,0.8)',
                      top: '50%',
                      left: '-20%',
                      transform: 'rotate(-45deg)',
                      boxShadow: '0 0 0 0.5px rgba(0,0,0,0.3)',
                    }}
                  />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Badge pequeño para usar en el carrito
export function VarianteBadge({ variante }: { variante: string }) {
  const upper = variante.toUpperCase()
  const isSurtido = upper.includes('SURTIDO')
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs"
      style={{ background: 'var(--color-acero-brillo)', color: 'var(--color-acero-oscuro)', border: '1px solid var(--color-acero-claro)' }}
    >
      <span
        className="inline-block rounded-full flex-shrink-0"
        style={{
          width: 8,
          height: 8,
          ...(isSurtido
            ? { background: 'linear-gradient(135deg, #ef4444, #3b82f6, #4ade80)' }
            : getSwatchStyle(variante)),
          border: '1px solid rgba(0,0,0,0.15)',
        }}
      />
      {variante.charAt(0) + variante.slice(1).toLowerCase()}
    </span>
  )
}
