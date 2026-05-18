'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, GripVertical, CheckCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

interface FaqItem { pregunta: string; respuesta: string }
interface NosotrosData {
  hero_titulo: string
  hero_texto: string
  valor_1_titulo: string; valor_1_texto: string
  valor_2_titulo: string; valor_2_texto: string
  valor_3_titulo: string; valor_3_texto: string
}
interface Props {
  tab: string
  nosotros: NosotrosData
  faq: FaqItem[]
}

// ── Nosotros ──────────────────────────────────────────────────────────────────

function NosotrosEditor({ inicial }: { inicial: NosotrosData }) {
  const supabase = createClient()
  const [data, setData] = useState<NosotrosData>(inicial)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function set(key: keyof NosotrosData, val: string) {
    setData(prev => ({ ...prev, [key]: val }))
  }

  function toast_(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  async function guardar() {
    setSaving(true)
    const pares: [string, string][] = [
      ['nosotros_hero_titulo',  data.hero_titulo],
      ['nosotros_hero_texto',   data.hero_texto],
      ['nosotros_valor_1_titulo', data.valor_1_titulo],
      ['nosotros_valor_1_texto',  data.valor_1_texto],
      ['nosotros_valor_2_titulo', data.valor_2_titulo],
      ['nosotros_valor_2_texto',  data.valor_2_texto],
      ['nosotros_valor_3_titulo', data.valor_3_titulo],
      ['nosotros_valor_3_texto',  data.valor_3_texto],
    ]
    for (const [clave, valor] of pares) {
      await supabase.from('configuracion').upsert({ clave, valor }, { onConflict: 'clave' })
    }
    setSaving(false)
    toast_('Cambios guardados')
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-base"
          style={{ background: 'var(--color-granito)', color: 'white' }}>
          <CheckCircle size={15} /> {toast}
        </div>
      )}

      {/* Hero */}
      <section className="flex flex-col gap-4 p-5 rounded-xl border" style={{ borderColor: 'var(--color-acero-claro)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Encabezado principal</p>
        <Field label="Título" value={data.hero_titulo} onChange={v => set('hero_titulo', v)} />
        <Field label="Texto introductorio" value={data.hero_texto} onChange={v => set('hero_texto', v)} multiline />
      </section>

      {/* Valores */}
      <section className="flex flex-col gap-4 p-5 rounded-xl border" style={{ borderColor: 'var(--color-acero-claro)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Cómo trabajamos — 3 pilares</p>
        {([1, 2, 3] as const).map(n => (
          <div key={n} className="flex flex-col gap-2 pt-3 border-t" style={{ borderColor: 'var(--color-acero-claro)' }}>
            <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-acero-oscuro)' }}>Pilar {n}</p>
            <Field label="Título" value={data[`valor_${n}_titulo`]} onChange={v => set(`valor_${n}_titulo`, v)} />
            <Field label="Descripción" value={data[`valor_${n}_texto`]} onChange={v => set(`valor_${n}_texto`, v)} multiline />
          </div>
        ))}
      </section>

      <button
        onClick={guardar}
        disabled={saving}
        className="self-start flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
        style={{ background: 'var(--color-granito)', color: 'white' }}
      >
        {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando…</> : 'Guardar cambios'}
      </button>
    </div>
  )
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

function FaqEditor({ inicial }: { inicial: FaqItem[] }) {
  const supabase = createClient()
  const [items, setItems] = useState<FaqItem[]>(inicial)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)

  function toast_(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  function agregar() {
    const nuevo = [...items, { pregunta: '', respuesta: '' }]
    setItems(nuevo)
    setExpanded(nuevo.length - 1)
  }

  function actualizar(idx: number, key: keyof FaqItem, val: string) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [key]: val } : item))
  }

  function eliminar(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
    setExpanded(null)
  }

  function mover(idx: number, dir: 'up' | 'down') {
    const target = dir === 'up' ? idx - 1 : idx + 1
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setItems(next)
  }

  async function guardar() {
    setSaving(true)
    await supabase.from('configuracion').upsert(
      { clave: 'faq_items', valor: JSON.stringify(items) },
      { onConflict: 'clave' }
    )
    setSaving(false)
    toast_('Preguntas guardadas')
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-base"
          style={{ background: 'var(--color-granito)', color: 'white' }}>
          <CheckCircle size={15} /> {toast}
        </div>
      )}

      {items.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
          No hay preguntas todavía. Agregá la primera.
        </p>
      )}

      {items.map((item, idx) => (
        <div key={idx} className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-acero-claro)' }}>
          {/* Header del item */}
          <div
            className="flex items-center gap-2 px-4 py-3 cursor-pointer"
            style={{ background: 'var(--color-acero-brillo)' }}
            onClick={() => setExpanded(expanded === idx ? null : idx)}
          >
            <GripVertical size={14} style={{ color: 'var(--color-acero-oscuro)' }} />
            <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
              {item.pregunta || <span style={{ color: 'var(--color-acero-oscuro)' }}>Sin título</span>}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={e => { e.stopPropagation(); mover(idx, 'up') }} disabled={idx === 0}
                className="p-1 rounded hover:bg-black/5 disabled:opacity-30">
                <ChevronUp size={14} style={{ color: 'var(--color-acero-oscuro)' }} />
              </button>
              <button onClick={e => { e.stopPropagation(); mover(idx, 'down') }} disabled={idx === items.length - 1}
                className="p-1 rounded hover:bg-black/5 disabled:opacity-30">
                <ChevronDown size={14} style={{ color: 'var(--color-acero-oscuro)' }} />
              </button>
              <button onClick={e => { e.stopPropagation(); eliminar(idx) }}
                className="p-1 rounded hover:bg-red-50">
                <Trash2 size={14} style={{ color: '#ef4444' }} />
              </button>
            </div>
          </div>

          {/* Cuerpo editable */}
          {expanded === idx && (
            <div className="flex flex-col gap-3 p-4 border-t" style={{ borderColor: 'var(--color-acero-claro)' }}>
              <Field label="Pregunta" value={item.pregunta} onChange={v => actualizar(idx, 'pregunta', v)} />
              <Field label="Respuesta" value={item.respuesta} onChange={v => actualizar(idx, 'respuesta', v)} multiline />
            </div>
          )}
        </div>
      ))}

      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={agregar}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
          style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
        >
          <Plus size={14} /> Agregar pregunta
        </button>
        <button
          onClick={guardar}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          style={{ background: 'var(--color-granito)', color: 'white' }}
        >
          {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando…</> : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

// ── Campo reutilizable ────────────────────────────────────────────────────────

function Field({ label, value, onChange, multiline = false }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean
}) {
  const base = "w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors focus:border-[var(--color-granito)]"
  const style = { borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }

  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>{label}</label>
      {multiline
        ? <textarea rows={3} value={value} onChange={e => onChange(e.target.value)} className={`${base} resize-y`} style={style} />
        : <input type="text" value={value} onChange={e => onChange(e.target.value)} className={base} style={style} />
      }
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

export function ContenidoClient({ tab, nosotros, faq }: Props) {
  const vistaActual = tab === 'faq' ? 'faq' : 'nosotros'

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b flex-shrink-0" style={{ borderColor: 'var(--color-acero-claro)' }}>
        {[
          { key: 'nosotros', label: 'Nosotros' },
          { key: 'faq',      label: 'Preguntas frecuentes' },
        ].map(({ key, label }) => (
          <a
            key={key}
            href={key === 'nosotros' ? '?' : `?tab=${key}`}
            className="px-4 py-2 text-base transition-colors duration-150 border-b-2 -mb-px"
            style={{
              borderColor: vistaActual === key ? 'var(--color-granito)' : 'transparent',
              color: vistaActual === key ? 'var(--foreground)' : 'var(--color-acero-oscuro)',
            }}
          >
            {label}
          </a>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pb-8">
        {vistaActual === 'nosotros'
          ? <NosotrosEditor inicial={nosotros} />
          : <FaqEditor inicial={faq} />
        }
      </div>
    </div>
  )
}
