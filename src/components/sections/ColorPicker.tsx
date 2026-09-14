'use client'

import { getSwatchStyle, capitalizeVariante, esMedida } from '@/lib/variantes'

export interface Variante {
  nombre: string
  stock: number
}

interface Props {
  variantes: Variante[]
  selected: string | null
  onSelect: (nombre: string) => void
}

export { getSwatchStyle, capitalizeVariante } from '@/lib/variantes'

export function ColorPicker({ variantes, selected, onSelect }: Props) {
  if (!variantes || variantes.length === 0) return null

  const todasMedidas = variantes.every(v => esMedida(v.nombre))
  const label = todasMedidas ? 'Medida' : 'Color'

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
        {label}:{' '}
        {selected && (
          <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>
            {capitalizeVariante(selected)}
          </span>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        {variantes.map(v => {
          const sinStock = v.stock <= 0
          const isSelected = selected === v.nombre
          if (todasMedidas) {
            return (
              <button
                key={v.nombre}
                onClick={() => !sinStock && onSelect(v.nombre)}
                disabled={sinStock}
                title={`${capitalizeVariante(v.nombre)}${sinStock ? ' — Sin stock' : ''}`}
                aria-pressed={isSelected}
                className="rounded px-3 py-1.5 text-xs transition-colors disabled:cursor-not-allowed"
                style={{
                  border: `1px solid ${isSelected ? 'var(--foreground)' : 'var(--color-acero-claro)'}`,
                  color: sinStock ? 'var(--color-acero-oscuro)' : 'var(--foreground)',
                  background: isSelected ? 'var(--color-acero-brillo)' : 'transparent',
                  opacity: sinStock ? 0.5 : 1,
                  textDecoration: sinStock ? 'line-through' : 'none',
                }}
              >
                {capitalizeVariante(v.nombre)}
              </button>
            )
          }
          return (
            <button
              key={v.nombre}
              onClick={() => !sinStock && onSelect(v.nombre)}
              disabled={sinStock}
              title={`${capitalizeVariante(v.nombre)}${sinStock ? ' — Sin stock' : ''}`}
              aria-label={`${capitalizeVariante(v.nombre)}${sinStock ? ', sin stock' : ''}`}
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
