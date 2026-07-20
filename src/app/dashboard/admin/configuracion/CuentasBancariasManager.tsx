'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react'

// Manager genérico de cuentas bancarias (sin IVA / +IVA). La lógica es idéntica
// en ambos casos; solo cambian las server actions y el texto del estado vacío,
// que se pasan por props para no duplicar el componente.

export type TipoCuenta = 'CBU' | 'CVU' | 'deposito'
export type CuentaBancaria = {
  id: number
  nombre: string
  tipo: TipoCuenta
  cbu: string
  alias: string
  cuit?: string | null
  banco?: string | null
}

type CuentaInput = { nombre: string; tipo: TipoCuenta; cbu: string; alias: string; cuit?: string; banco?: string }

export type AccionesCuenta = {
  crear: (data: CuentaInput) => Promise<{ ok: boolean; error?: string; cuenta?: CuentaBancaria }>
  actualizar: (id: number, data: CuentaInput) => Promise<{ ok: boolean; error?: string }>
  eliminar: (id: number) => Promise<{ ok: boolean; error?: string }>
}

const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border outline-none'
const inputStyle: React.CSSProperties = {
  borderColor: 'var(--color-acero-claro)',
  color: 'var(--foreground)',
  background: 'white',
}

type FormState = {
  nombre: string
  tipo: TipoCuenta
  cbu: string
  alias: string
  cuit: string
  banco: string
}
const EMPTY: FormState = { nombre: '', tipo: 'CBU', cbu: '', alias: '', cuit: '', banco: '' }

const TIPOS: { value: TipoCuenta; label: string }[] = [
  { value: 'CBU',      label: 'CBU' },
  { value: 'CVU',      label: 'CVU' },
  { value: 'deposito', label: 'Depósito' },
]

function CuentaForm({
  initial,
  onSave,
  onCancel,
  isPending,
  error,
}: {
  initial: FormState
  onSave: (data: FormState) => void
  onCancel: () => void
  isPending: boolean
  error: string | null
}) {
  const [form, setForm] = useState<FormState>(initial)
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const esDeposito = form.tipo === 'deposito'

  return (
    <div className="rounded-lg border p-4 flex flex-col gap-3"
      style={{ borderColor: 'var(--color-acero-claro)', background: 'var(--color-acero-brillo)' }}>

      {/* Selector de tipo */}
      <div>
        <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-acero-oscuro)' }}>
          Tipo <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <div className="flex rounded-lg border overflow-hidden w-fit" style={{ borderColor: 'var(--color-acero-claro)' }}>
          {TIPOS.map(t => (
            <button key={t.value} type="button"
              onClick={() => setForm(prev => ({ ...prev, tipo: t.value }))}
              className="px-3 py-1.5 text-xs transition-colors"
              style={{
                background: form.tipo === t.value ? 'var(--color-granito)' : 'white',
                color: form.tipo === t.value ? 'white' : 'var(--color-acero-oscuro)',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {esDeposito ? (
        /* ── Campos depósito ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>
              Razón social <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input value={form.nombre} onChange={set('nombre')} placeholder="Ej: GRUPO GRANDE SRL"
              className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>
              CUIT <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input value={form.cuit} onChange={set('cuit')} placeholder="30-71609555-6"
              className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>
              Banco <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input value={form.banco} onChange={set('banco')} placeholder="Ej: ICBC"
              className={inputClass} style={inputStyle} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>
              Número de cuenta (CTA/CTE) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input value={form.cbu} onChange={set('cbu')} placeholder="0501/02141345/84"
              className={inputClass} style={inputStyle} />
          </div>
        </div>
      ) : (
        /* ── Campos CBU / CVU ── */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>
              Nombre
            </label>
            <input value={form.nombre} onChange={set('nombre')} placeholder="Ej: Cuenta Galicia"
              className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>
              {form.tipo} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input value={form.cbu} onChange={set('cbu')} placeholder="0000000000000000000000"
              className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>
              Alias
            </label>
            <input value={form.alias} onChange={set('alias')} placeholder="cuenta.alias"
              className={inputClass} style={inputStyle} />
          </div>
        </div>
      )}

      {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel}
          className="px-3 py-1.5 text-sm rounded-lg border"
          style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}>
          <X size={13} className="inline mr-1" />Cancelar
        </button>
        <button type="button" onClick={() => onSave(form)} disabled={isPending}
          className="px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 disabled:opacity-60"
          style={{ background: 'var(--color-granito)', color: 'var(--color-acero-brillo)' }}>
          {isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          Guardar
        </button>
      </div>
    </div>
  )
}

function cuentaToForm(c: CuentaBancaria): FormState {
  return {
    nombre: c.nombre,
    tipo: c.tipo,
    cbu: c.cbu,
    alias: c.alias,
    cuit: c.cuit ?? '',
    banco: c.banco ?? '',
  }
}

function validarForm(data: FormState): string | null {
  if (data.tipo === 'deposito') {
    if (!data.nombre.trim()) return 'La razón social es obligatoria.'
    if (!data.cuit.trim())   return 'El CUIT es obligatorio.'
    if (!data.banco.trim())  return 'El banco es obligatorio.'
    if (!data.cbu.trim())    return 'El número de cuenta es obligatorio.'
  } else {
    if (!data.cbu.trim()) return `El ${data.tipo} es obligatorio.`
  }
  return null
}

function ResumenCuenta({ c }: { c: CuentaBancaria }) {
  if (c.tipo === 'deposito') {
    return (
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{c.nombre}</p>
        <p className="text-xs font-mono" style={{ color: 'var(--color-acero-oscuro)' }}>
          Depósito · CUIT: {c.cuit} · {c.banco} · CTA/CTE: {c.cbu}
        </p>
      </div>
    )
  }
  return (
    <div>
      <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{c.nombre || `${c.tipo}: ${c.cbu}`}</p>
      <p className="text-xs font-mono" style={{ color: 'var(--color-acero-oscuro)' }}>
        {c.tipo}: {c.cbu}{c.alias ? ` · Alias: ${c.alias}` : ''}
      </p>
    </div>
  )
}

export function CuentasBancariasManager({
  inicial,
  acciones,
  textoVacio,
}: {
  inicial: CuentaBancaria[]
  acciones: AccionesCuenta
  textoVacio: string
}) {
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>(inicial)
  const [agregando, setAgregando] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [confirmEliminar, setConfirmEliminar] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleAgregar(data: FormState) {
    const err = validarForm(data)
    if (err) { setError(err); return }
    setError(null)
    startTransition(async () => {
      const res = await acciones.crear(data)
      if (!res.ok || !res.cuenta) { setError(res.error ?? 'Error al guardar.'); return }
      setCuentas(prev => [...prev, res.cuenta!])
      setAgregando(false)
      router.refresh()
    })
  }

  function handleActualizar(id: number, data: FormState) {
    const err = validarForm(data)
    if (err) { setError(err); return }
    setError(null)
    startTransition(async () => {
      const res = await acciones.actualizar(id, data)
      if (!res.ok) { setError(res.error ?? 'Error al guardar.'); return }
      setCuentas(prev => prev.map(c => c.id === id ? { ...c, ...data } : c))
      setEditandoId(null)
    })
  }

  function handleEliminar(id: number) {
    startTransition(async () => {
      const res = await acciones.eliminar(id)
      if (!res.ok) { setError(res.error ?? 'Error al eliminar.'); return }
      setCuentas(prev => prev.filter(c => c.id !== id))
      setConfirmEliminar(null)
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {cuentas.length === 0 && !agregando && (
        <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
          {textoVacio}
        </p>
      )}

      {cuentas.map(c => (
        <div key={c.id}>
          {editandoId === c.id ? (
            <CuentaForm
              initial={cuentaToForm(c)}
              onSave={data => handleActualizar(c.id, data)}
              onCancel={() => setEditandoId(null)}
              isPending={isPending}
              error={error}
            />
          ) : (
            <div className="rounded-lg border px-4 py-3 flex items-center gap-4"
              style={{ borderColor: 'var(--color-acero-claro)', background: 'white' }}>
              <div className="flex-1 min-w-0">
                <ResumenCuenta c={c} />
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => { setEditandoId(c.id); setError(null) }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Editar">
                  <Pencil size={13} style={{ color: 'var(--color-acero-oscuro)' }} />
                </button>
                {confirmEliminar === c.id ? (
                  <>
                    <button onClick={() => handleEliminar(c.id)}
                      className="px-2 py-1 text-xs rounded"
                      style={{ background: '#fee2e2', color: '#ef4444' }}>
                      Confirmar
                    </button>
                    <button onClick={() => setConfirmEliminar(null)}
                      className="px-2 py-1 text-xs rounded border"
                      style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}>
                      No
                    </button>
                  </>
                ) : (
                  <button onClick={() => setConfirmEliminar(c.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Eliminar">
                    <Trash2 size={13} style={{ color: '#ef4444' }} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {agregando ? (
        <CuentaForm
          initial={EMPTY}
          onSave={handleAgregar}
          onCancel={() => { setAgregando(false); setError(null) }}
          isPending={isPending}
          error={error}
        />
      ) : (
        <button type="button"
          onClick={() => { setAgregando(true); setError(null) }}
          className="self-start flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors hover:bg-gray-50"
          style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
        >
          <Plus size={14} />
          Agregar cuenta
        </button>
      )}

      {error && !agregando && editandoId === null && (
        <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
      )}
    </div>
  )
}
