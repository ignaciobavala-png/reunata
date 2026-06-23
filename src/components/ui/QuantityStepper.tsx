'use client'

import { useEffect, useState } from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'

interface Props {
  value: number
  multiplo?: number
  max?: number | null
  size?: 'sm' | 'md'
  plusDisabled?: boolean
  /** Si se pasa, el botón − al mínimo muestra papelera y llama esta función. Si no, queda deshabilitado al mínimo. */
  onRemove?: () => void
  onCommit: (n: number) => void
}

export function QuantityStepper({
  value,
  multiplo = 1,
  max,
  size = 'md',
  plusDisabled = false,
  onRemove,
  onCommit,
}: Props) {
  const [draft, setDraft] = useState(String(value))

  // Sincronizar cuando el valor cambia desde afuera (botones +/-)
  useEffect(() => {
    setDraft(String(value))
  }, [value])

  function commit() {
    const n = parseInt(draft, 10)
    if (isNaN(n) || n <= 0) {
      setDraft(String(value))
      return
    }
    // Redondeo siempre hacia arriba al múltiplo más cercano
    let snapped = Math.ceil(n / multiplo) * multiplo
    if (max != null && snapped > max) {
      snapped = Math.floor(max / multiplo) * multiplo
      if (snapped <= 0) { setDraft(String(value)); return }
    }
    onCommit(snapped)
    setDraft(String(snapped))
  }

  function handleMenos() {
    if (value <= multiplo) {
      onRemove?.()
      return
    }
    onCommit(value - multiplo)
  }

  const atMin = value <= multiplo
  const sm = size === 'sm'

  if (sm) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleMenos}
          disabled={atMin && !onRemove}
          className="w-6 h-6 rounded border flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ borderColor: 'var(--color-acero-claro)' }}
          aria-label="Reducir cantidad"
        >
          {atMin && onRemove
            ? <Trash2 size={10} style={{ color: '#ef4444' }} />
            : <Minus size={10} strokeWidth={2.5} />
          }
        </button>
        <input
          type="number"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => e.key === 'Enter' && commit()}
          className="w-10 text-xs text-center font-semibold tabular-nums outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          style={{ color: 'var(--foreground)' }}
          min={multiplo}
          step={multiplo}
          aria-label="Cantidad"
        />
        <button
          onClick={() => onCommit(value + multiplo)}
          disabled={plusDisabled}
          className="w-6 h-6 rounded border flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ borderColor: 'var(--color-acero-claro)' }}
          aria-label="Aumentar cantidad"
        >
          <Plus size={10} strokeWidth={2.5} />
        </button>
      </div>
    )
  }

  return (
    <div
      className="flex items-center rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--color-acero-claro)', background: 'var(--color-acero-brillo)' }}
    >
      <button
        onClick={handleMenos}
        disabled={atMin && !onRemove}
        className="w-10 h-10 flex items-center justify-center transition-colors hover:bg-[var(--color-acero-claro)] disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ color: 'var(--color-granito)' }}
        aria-label="Reducir cantidad"
      >
        {atMin && onRemove
          ? <Trash2 size={13} style={{ color: '#ef4444' }} />
          : <Minus size={13} strokeWidth={2.5} />
        }
      </button>
      <input
        type="number"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => e.key === 'Enter' && commit()}
        className="w-14 text-center text-base font-semibold tabular-nums outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        style={{ color: 'var(--foreground)' }}
        min={multiplo}
        step={multiplo}
        aria-label="Cantidad"
      />
      <button
        onClick={() => onCommit(value + multiplo)}
        disabled={plusDisabled}
        className="w-10 h-10 flex items-center justify-center transition-colors hover:bg-[var(--color-acero-claro)] disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ color: 'var(--color-granito)' }}
        aria-label="Aumentar cantidad"
      >
        <Plus size={13} strokeWidth={2.5} />
      </button>
    </div>
  )
}
