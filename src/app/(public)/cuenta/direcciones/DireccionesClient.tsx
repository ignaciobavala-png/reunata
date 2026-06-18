'use client'

import { useState, useTransition } from 'react'
import { MapPin, Plus, Pencil, Trash2, Star, Loader2, X } from 'lucide-react'
import { crearDireccion, actualizarDireccion, eliminarDireccion, marcarPredeterminada } from '@/app/actions/direcciones'

interface Direccion {
  id: string
  alias: string
  calle: string
  numero: string
  piso: string | null
  localidad: string
  provincia: string
  codigo_postal: string
  predeterminada: boolean
}

const PROVINCIAS = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán',
]

const EMPTY: Omit<Direccion, 'id' | 'predeterminada'> = {
  alias: '', calle: '', numero: '', piso: null, localidad: '', provincia: '', codigo_postal: '',
}

function DireccionForm({
  initial,
  onCancel,
  onSave,
}: {
  initial?: Partial<Direccion>
  onCancel: () => void
  onSave: (fd: FormData) => Promise<{ error?: string; ok?: boolean }>
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [predeterminada, setPredeterminada] = useState(initial?.predeterminada ?? false)

  const v = { ...EMPTY, ...initial }

  const campo = (name: string, label: string, defaultValue: string, opts?: { required?: boolean }) => (
    <div>
      <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>
        {label}{opts?.required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      <input
        name={name}
        defaultValue={defaultValue}
        required={opts?.required}
        className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
        style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)', background: 'white' }}
      />
    </div>
  )

  function handleSubmit(fd: FormData) {
    fd.set('predeterminada', predeterminada ? 'true' : 'false')
    startTransition(async () => {
      const res = await onSave(fd)
      if (res.error) setError(res.error)
    })
  }

  return (
    <form action={handleSubmit} className="rounded-xl border p-5 flex flex-col gap-4"
      style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {campo('alias',         'Alias (ej: Depósito, Sucursal)',   v.alias)}
        {campo('calle',         'Calle',                           v.calle,         { required: true })}
        {campo('numero',        'Número',                          v.numero,        { required: true })}
        {campo('piso',          'Piso / Dpto (opcional)',          v.piso ?? '')}
        {campo('localidad',     'Localidad',                       v.localidad,     { required: true })}
        {campo('codigo_postal', 'Código postal',                   v.codigo_postal, { required: true })}
      </div>

      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>
          Provincia <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <select
          name="provincia"
          defaultValue={v.provincia}
          required
          className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
          style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)', background: 'white' }}
        >
          <option value="">Seleccioná una provincia</option>
          {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={predeterminada}
          onChange={e => setPredeterminada(e.target.checked)}
          className="rounded"
        />
        <span className="text-sm" style={{ color: 'var(--foreground)' }}>
          Usar como dirección predeterminada
        </span>
      </label>

      {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm rounded-lg border"
          style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}>
          Cancelar
        </button>
        <button type="submit" disabled={isPending}
          className="px-4 py-2 text-sm rounded-lg flex items-center gap-1.5 disabled:opacity-60"
          style={{ background: 'var(--color-granito)', color: 'var(--color-acero-brillo)' }}>
          {isPending && <Loader2 size={13} className="animate-spin" />}
          Guardar
        </button>
      </div>
    </form>
  )
}

export function DireccionesClient({ direcciones: inicial }: { direcciones: Direccion[] }) {
  const [direcciones, setDirecciones] = useState(inicial)
  const [modo, setModo] = useState<'idle' | 'nueva' | string>('idle') // string = id editando
  const [isPending, startTransition] = useTransition()
  const [confirmEliminar, setConfirmEliminar] = useState<string | null>(null)

  function labelDireccion(d: Direccion) {
    const partes = [d.calle, d.numero, d.piso].filter(Boolean).join(' ')
    return `${partes}, ${d.localidad}, ${d.provincia} (${d.codigo_postal})`
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Lista */}
      {direcciones.map(d => (
        <div key={d.id} className="rounded-xl border p-5"
          style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}>

          {modo === d.id ? (
            <DireccionForm
              initial={d}
              onCancel={() => setModo('idle')}
              onSave={async (fd) => {
                const res = await actualizarDireccion(d.id, fd)
                if (res.ok) setModo('idle')
                return res
              }}
            />
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <MapPin size={16} strokeWidth={1.5} className="mt-0.5 flex-shrink-0"
                  style={{ color: 'var(--color-acero-oscuro)' }} />
                <div>
                  {d.alias && (
                    <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--foreground)' }}>{d.alias}</p>
                  )}
                  <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>{labelDireccion(d)}</p>
                  {d.predeterminada && (
                    <span className="inline-flex items-center gap-1 mt-1.5 text-xs px-2 py-0.5 rounded-full"
                      style={{ background: '#fef9c3', color: '#854d0e' }}>
                      <Star size={10} fill="currentColor" /> Predeterminada
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {!d.predeterminada && (
                  <button
                    onClick={() => startTransition(async () => { await marcarPredeterminada(d.id) })}
                    disabled={isPending}
                    className="p-2 rounded-lg hover:bg-[var(--color-acero-brillo)] transition-colors"
                    title="Marcar como predeterminada"
                    style={{ color: 'var(--color-acero-oscuro)' }}>
                    <Star size={14} strokeWidth={1.5} />
                  </button>
                )}
                <button onClick={() => setModo(d.id)}
                  className="p-2 rounded-lg hover:bg-[var(--color-acero-brillo)] transition-colors"
                  title="Editar" style={{ color: 'var(--color-acero-oscuro)' }}>
                  <Pencil size={14} strokeWidth={1.5} />
                </button>
                {confirmEliminar === d.id ? (
                  <div className="flex items-center gap-1.5 ml-1">
                    <button onClick={() => startTransition(async () => {
                        await eliminarDireccion(d.id)
                        setDirecciones(prev => prev.filter(x => x.id !== d.id))
                        setConfirmEliminar(null)
                      })}
                      className="text-xs font-medium px-2 py-1 rounded"
                      style={{ background: '#fee2e2', color: '#ef4444' }}>
                      Eliminar
                    </button>
                    <button onClick={() => setConfirmEliminar(null)}
                      className="p-1 rounded" style={{ color: 'var(--color-acero-oscuro)' }}>
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmEliminar(d.id)}
                    className="p-2 rounded-lg hover:bg-[var(--color-acero-brillo)] transition-colors"
                    title="Eliminar" style={{ color: '#ef4444' }}>
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Nueva dirección */}
      {modo === 'nueva' ? (
        <DireccionForm
          onCancel={() => setModo('idle')}
          onSave={async (fd) => {
            const res = await crearDireccion(fd)
            if (res.ok) setModo('idle')
            return res
          }}
        />
      ) : (
        <button
          onClick={() => setModo('nueva')}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed text-sm transition-colors hover:bg-[var(--color-acero-brillo)]"
          style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}>
          <Plus size={15} strokeWidth={1.5} />
          Agregar dirección
        </button>
      )}
    </div>
  )
}
