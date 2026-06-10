'use client'

import { useState } from 'react'
import { Loader2, Truck, ChevronDown, ChevronUp } from 'lucide-react'
import { formatPrecio } from '@/lib/utils'
import type { OpcionEnvio } from '@/app/api/envio/cotizar/route'

const PROVINCIAS = [
  { id: 'B', nombre: 'Buenos Aires (Provincia)' },
  { id: 'C', nombre: 'CABA' },
  { id: 'K', nombre: 'Catamarca' },
  { id: 'H', nombre: 'Chaco' },
  { id: 'U', nombre: 'Chubut' },
  { id: 'X', nombre: 'Córdoba' },
  { id: 'W', nombre: 'Corrientes' },
  { id: 'E', nombre: 'Entre Ríos' },
  { id: 'P', nombre: 'Formosa' },
  { id: 'Y', nombre: 'Jujuy' },
  { id: 'L', nombre: 'La Pampa' },
  { id: 'F', nombre: 'La Rioja' },
  { id: 'M', nombre: 'Mendoza' },
  { id: 'N', nombre: 'Misiones' },
  { id: 'Q', nombre: 'Neuquén' },
  { id: 'R', nombre: 'Río Negro' },
  { id: 'A', nombre: 'Salta' },
  { id: 'J', nombre: 'San Juan' },
  { id: 'D', nombre: 'San Luis' },
  { id: 'Z', nombre: 'Santa Cruz' },
  { id: 'S', nombre: 'Santa Fe' },
  { id: 'G', nombre: 'Santiago del Estero' },
  { id: 'V', nombre: 'Tierra del Fuego' },
  { id: 'T', nombre: 'Tucumán' },
]

interface Props {
  items: { productoId: number; cantidad: number }[]
  onSelect: (opcion: { descripcion: string; costo: number } | null) => void
  seleccionada: { descripcion: string; costo: number } | null
}

export function EnvioCotizador({ items, onSelect, seleccionada }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [provincia, setProvincia] = useState('')
  const [cp, setCp] = useState('')
  const [cargando, setCargando] = useState(false)
  const [opciones, setOpciones] = useState<OpcionEnvio[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null)

  async function calcular() {
    if (!provincia || cp.length < 4) return
    setCargando(true)
    setError(null)
    setOpciones(null)
    onSelect(null)
    setSeleccionadaId(null)

    try {
      const res = await fetch('/api/envio/cotizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, codigo_postal: cp, provincia }),
      })
      const data = await res.json()

      if (data.error && !data.opciones?.length) {
        setError(data.error)
      } else if (!data.opciones?.length) {
        setError('No hay opciones de envío para esta zona.')
      } else {
        setOpciones(data.opciones)
      }
    } catch {
      setError('No se pudo conectar. Intentá de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  function handleSelect(opcion: OpcionEnvio) {
    setSeleccionadaId(opcion.id)
    onSelect({ descripcion: `${opcion.descripcion} · ${opcion.dias} día${opcion.dias !== 1 ? 's' : ''}`, costo: opcion.costo })
  }

  const inputClass = 'w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none'
  const inputStyle: React.CSSProperties = {
    borderColor: 'var(--color-acero-claro)',
    color: 'var(--foreground)',
    background: 'white',
  }

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-acero-claro)' }}>
      {/* Header toggle */}
      <button
        onClick={() => setAbierto(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors hover:bg-gray-50"
        style={{ color: 'var(--foreground)', background: seleccionada ? '#f0fdf4' : undefined }}
      >
        <div className="flex items-center gap-2">
          <Truck size={13} style={{ color: seleccionada ? '#16a34a' : 'var(--color-acero-oscuro)' }} />
          <span className="font-medium text-xs">
            {seleccionada ? seleccionada.descripcion : 'Calcular envío'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {seleccionada && (
            <span className="text-xs font-semibold" style={{ color: '#16a34a' }}>
              {formatPrecio(seleccionada.costo)}
            </span>
          )}
          {abierto
            ? <ChevronUp size={13} style={{ color: 'var(--color-acero-oscuro)' }} />
            : <ChevronDown size={13} style={{ color: 'var(--color-acero-oscuro)' }} />
          }
        </div>
      </button>

      {/* Panel expandible */}
      {abierto && (
        <div className="px-3 pb-3 pt-1 flex flex-col gap-2.5" style={{ borderTop: '1px solid var(--color-acero-claro)' }}>
          {/* Inputs */}
          <select
            value={provincia}
            onChange={e => { setProvincia(e.target.value); setOpciones(null); setError(null) }}
            className={inputClass}
            style={inputStyle}
          >
            <option value="">Provincia…</option>
            {PROVINCIAS.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>

          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="Código postal"
              value={cp}
              onChange={e => { setCp(e.target.value.replace(/\D/g, '')); setOpciones(null); setError(null) }}
              className={inputClass}
              style={inputStyle}
            />
            <button
              onClick={calcular}
              disabled={cargando || !provincia || cp.length < 4}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 transition-opacity"
              style={{ background: 'var(--color-granito)', color: 'white' }}
            >
              {cargando ? <Loader2 size={11} className="animate-spin" /> : 'Calcular'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
          )}

          {/* Opciones */}
          {opciones && opciones.length > 0 && (
            <div className="flex flex-col gap-1">
              {opciones.map(op => (
                <label
                  key={op.id}
                  className="flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors"
                  style={{
                    border: `1.5px solid ${seleccionadaId === op.id ? 'var(--color-granito)' : 'var(--color-acero-claro)'}`,
                    background: seleccionadaId === op.id ? 'var(--color-acero-brillo)' : 'white',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="envio-opcion"
                      checked={seleccionadaId === op.id}
                      onChange={() => handleSelect(op)}
                      className="accent-granito"
                    />
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{op.descripcion}</p>
                      <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                        {op.dias} día{op.dias !== 1 ? 's' : ''} hábil{op.dias !== 1 ? 'es' : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
                    {formatPrecio(op.costo)}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
