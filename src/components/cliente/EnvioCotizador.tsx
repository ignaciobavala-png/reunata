'use client'

import { useState } from 'react'
import { Loader2, Truck, ChevronDown, ChevronUp } from 'lucide-react'
import { formatPrecio } from '@/lib/utils'
import type { OpcionEnvio } from '@/lib/enviopack'

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

export interface EnvioSeleccionado {
  descripcion: string
  costo: number
  provincia: string
  codigo_postal: string
  servicioId: string
  calle: string
  numero: string
  piso?: string
}

interface Props {
  items: { productoId: number; cantidad: number }[]
  onSelect: (opcion: EnvioSeleccionado | null) => void
  seleccionada: EnvioSeleccionado | null
  defaultOpen?: boolean
  envioFlexActivo?: boolean
  gratis?: boolean
}

export function EnvioCotizador({ items, onSelect, seleccionada, defaultOpen = false, envioFlexActivo = true, gratis = false }: Props) {
  const [abierto, setAbierto] = useState(defaultOpen)
  const [provincia, setProvincia] = useState('')
  const [cp, setCp] = useState('')
  const [cargando, setCargando] = useState(false)
  const [opciones, setOpciones] = useState<OpcionEnvio[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [opcionElegida, setOpcionElegida] = useState<OpcionEnvio | null>(null)

  // Dirección exacta — aparece tras elegir servicio
  const [calle, setCalle]   = useState('')
  const [numero, setNumero] = useState('')
  const [piso, setPiso]     = useState('')
  const [dirError, setDirError] = useState<string | null>(null)

  async function calcular() {
    if (!provincia || cp.length < 4) return
    setCargando(true)
    setError(null)
    setOpciones(null)
    onSelect(null)
    setOpcionElegida(null)
    setCalle('')
    setNumero('')
    setPiso('')
    setDirError(null)

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
        const filtradas = envioFlexActivo
          ? data.opciones
          : (data.opciones as OpcionEnvio[]).filter(
              (o: OpcionEnvio) => !o.descripcion.toLowerCase().includes('flex')
            )
        setOpciones(filtradas.length ? filtradas : data.opciones)
      }
    } catch {
      setError('No se pudo conectar. Intentá de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  function handleElegirOpcion(opcion: OpcionEnvio) {
    setOpcionElegida(opcion)
    onSelect(null) // resetear hasta confirmar dirección
    setDirError(null)
  }

  function handleConfirmar() {
    if (!calle.trim())   { setDirError('Ingresá la calle.'); return }
    if (!numero.trim())  { setDirError('Ingresá el número.'); return }
    if (!opcionElegida)  return
    onSelect({
      descripcion: `${opcionElegida.descripcion} · ${opcionElegida.dias} día${opcionElegida.dias !== 1 ? 's' : ''}`,
      costo: opcionElegida.costo,
      provincia,
      codigo_postal: cp,
      servicioId: opcionElegida.id,
      calle: calle.trim(),
      numero: numero.trim(),
      piso: piso.trim() || undefined,
    })
    setAbierto(false)
  }

  const inputClass = 'w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none'
  const inputStyle: React.CSSProperties = {
    borderColor: 'var(--color-acero-claro)',
    color: 'var(--foreground)',
    background: 'white',
  }

  return (
    // shrink-0: dentro del resumen (flex-col con max-h + overflow-y-auto) este div es el
    // único hijo con overflow-hidden, que anula su min-height:auto — sin esto el flexbox
    // lo aplasta a ~2px cuando el panel supera el alto máximo y el cotizador "desaparece".
    <div className="rounded-lg border overflow-hidden shrink-0" style={{ borderColor: 'var(--color-acero-claro)' }}>
      {/* Header toggle */}
      <button
        onClick={() => setAbierto(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors hover:bg-gray-50"
        style={{ color: 'var(--foreground)', background: seleccionada ? '#f0fdf4' : undefined }}
      >
        <div className="flex items-center gap-2">
          <Truck size={13} style={{ color: seleccionada ? '#16a34a' : 'var(--color-acero-oscuro)' }} />
          <span className="font-medium text-xs">
            {seleccionada
              ? `${seleccionada.descripcion} — ${seleccionada.calle} ${seleccionada.numero}${seleccionada.piso ? `, ${seleccionada.piso}` : ''}`
              : 'Calcular envío'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {seleccionada && (
            <span className="text-xs font-semibold" style={{ color: '#16a34a' }}>
              {gratis || seleccionada.costo === 0 ? 'Gratis' : formatPrecio(seleccionada.costo)}
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
          {gratis && (
            <p className="text-xs font-medium pt-1" style={{ color: '#16a34a' }}>
              Tu envío es gratis por el monto de tu compra. Solo necesitamos la dirección de entrega.
            </p>
          )}
          {/* Provincia + CP */}
          <select
            value={provincia}
            onChange={e => { setProvincia(e.target.value); setOpciones(null); setError(null); setOpcionElegida(null); onSelect(null) }}
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
              onChange={e => { setCp(e.target.value.replace(/\D/g, '')); setOpciones(null); setError(null); setOpcionElegida(null); onSelect(null) }}
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

          {error && (
            <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
          )}

          {/* Opciones de courier */}
          {opciones && opciones.length > 0 && (
            <div className="flex flex-col gap-1">
              {opciones.map(op => (
                <label
                  key={op.id}
                  className="flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors"
                  style={{
                    border: `1.5px solid ${opcionElegida?.id === op.id ? 'var(--color-granito)' : 'var(--color-acero-claro)'}`,
                    background: opcionElegida?.id === op.id ? 'var(--color-acero-brillo)' : 'white',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="envio-opcion"
                      checked={opcionElegida?.id === op.id}
                      onChange={() => handleElegirOpcion(op)}
                      className="accent-granito"
                    />
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{op.descripcion}</p>
                      <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                        {op.dias} día{op.dias !== 1 ? 's' : ''} hábil{op.dias !== 1 ? 'es' : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: gratis ? '#16a34a' : 'var(--foreground)' }}>
                    {gratis ? 'Gratis' : formatPrecio(op.costo)}
                  </span>
                </label>
              ))}
            </div>
          )}

          {/* Dirección exacta — aparece tras elegir courier */}
          {opcionElegida && (
            <div className="flex flex-col gap-2 pt-1" style={{ borderTop: '1px solid var(--color-acero-claro)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
                Dirección de entrega
              </p>
              <input
                type="text"
                placeholder="Calle *"
                value={calle}
                onChange={e => { setCalle(e.target.value); setDirError(null) }}
                className={inputClass}
                style={inputStyle}
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Número *"
                  value={numero}
                  onChange={e => { setNumero(e.target.value); setDirError(null) }}
                  className={inputClass}
                  style={inputStyle}
                />
                <input
                  type="text"
                  placeholder="Piso / Depto"
                  value={piso}
                  onChange={e => setPiso(e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              {dirError && (
                <p className="text-xs" style={{ color: '#ef4444' }}>{dirError}</p>
              )}
              <button
                onClick={handleConfirmar}
                className="w-full py-2 rounded-lg text-xs font-medium transition-opacity"
                style={{ background: 'var(--color-granito-oscuro)', color: 'white' }}
              >
                Confirmar envío
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
