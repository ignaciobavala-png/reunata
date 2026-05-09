'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle, Plus, X, GripVertical } from 'lucide-react'

const DEFAULT_ITEMS = [
  'Envío gratis desde $100.000',
  '6 cuotas sin interés',
  '10% Off por transferencia',
  '10% Off en próxima compra suscribiendo Newsletter',
  'El mate que te une',
]

const DEFAULT_SPEED = 30

export function PromoClient() {
  const supabase = createClient()
  const [items, setItems] = useState<string[]>([])
  const [speed, setSpeed] = useState(DEFAULT_SPEED)
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragIdx = useRef<number | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('configuracion')
        .select('clave, valor')
        .in('clave', ['promo_items', 'promo_speed'])

      const itemsRow = data?.find(r => r.clave === 'promo_items')
      if (itemsRow?.valor) {
        try { setItems(JSON.parse(itemsRow.valor)) } catch { setItems(DEFAULT_ITEMS) }
      } else {
        setItems(DEFAULT_ITEMS)
      }

      const speedRow = data?.find(r => r.clave === 'promo_speed')
      if (speedRow?.valor) {
        setSpeed(parseInt(speedRow.valor, 10) || DEFAULT_SPEED)
      }

      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line

  function addItem() {
    const text = inputValue.trim()
    if (!text) return
    setItems(prev => [...prev, text])
    setInputValue('')
    inputRef.current?.focus()
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addItem()
    }
  }

  function handleDragStart(idx: number) {
    dragIdx.current = idx
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    if (dragIdx.current === null || dragIdx.current === idx) return
    setItems(prev => {
      const copy = [...prev]
      const [moved] = copy.splice(dragIdx.current!, 1)
      copy.splice(idx, 0, moved)
      return copy
    })
    dragIdx.current = idx
  }

  function handleDragEnd() {
    dragIdx.current = null
  }

  async function guardar() {
    setSaving(true)

    await supabase
      .from('configuracion')
      .upsert({ clave: 'promo_items', valor: JSON.stringify(items) }, { onConflict: 'clave' })

    await supabase
      .from('configuracion')
      .upsert({ clave: 'promo_speed', valor: String(speed) }, { onConflict: 'clave' })

    setSaving(false)
    setToast('Cinta promocional guardada correctamente')
    setTimeout(() => setToast(null), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-acero-oscuro)' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-base"
          style={{ background: 'var(--color-granito)', color: 'white' }}>
          <CheckCircle size={15} />
          {toast}
        </div>
      )}

      <div className="flex-shrink-0 mb-6">
        <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
          Editá los textos que se muestran en la cinta promocional de la página principal.
          Presioná <kbd className="px-1.5 py-0.5 rounded border text-xs font-mono" style={{ borderColor: 'var(--color-acero-claro)' }}>Enter</kbd> para agregar cada frase.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-xl space-y-6 pb-6">

          {/* Input + botón */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribí una frase y presioná Enter..."
              className="flex-1 px-3 py-2 text-sm rounded-lg border outline-none"
              style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
            />
            <button
              onClick={addItem}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: 'var(--color-granito)', color: 'white' }}
            >
              <Plus size={14} />
              Agregar
            </button>
          </div>

          {/* Lista de tags */}
          {items.length === 0 ? (
            <div className="py-8 text-center text-sm rounded-lg border-2 border-dashed"
              style={{ color: 'var(--color-acero-oscuro)', borderColor: 'var(--color-acero-claro)' }}>
              No hay frases. Agregá la primera arriba.
            </div>
          ) : (
            <div className="space-y-1.5">
              {items.map((item, idx) => (
                <div
                  key={`${item}-${idx}`}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors group cursor-grab active:cursor-grabbing"
                  style={{ borderColor: 'var(--color-acero-claro)', background: 'white' }}
                >
                  <GripVertical size={14} className="opacity-30 group-hover:opacity-60 flex-shrink-0" style={{ color: 'var(--color-acero-oscuro)' }} />
                  <span className="flex-1 text-sm min-w-0 truncate" style={{ color: 'var(--foreground)' }}>
                    {item}
                  </span>
                  <span className="text-xs font-mono opacity-50 flex-shrink-0" style={{ color: 'var(--color-acero-oscuro)' }}>
                    {idx + 1}
                  </span>
                  <button
                    onClick={() => removeItem(idx)}
                    className="p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 flex-shrink-0"
                  >
                    <X size={12} style={{ color: '#ef4444' }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Velocidad */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--foreground)' }}>
              Velocidad de desplazamiento
            </label>
            <div className="flex items-center gap-4">
              <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>Rápido</span>
              <input
                type="range"
                min={10}
                max={60}
                value={speed}
                onChange={e => setSpeed(parseInt(e.target.value, 10))}
                className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: 'var(--color-acero-claro)',
                  accentColor: 'var(--color-granito)',
                }}
              />
              <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>Lento</span>
              <span
                className="w-12 text-center px-2 py-1 rounded border text-sm font-mono"
                style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
              >
                {speed}s
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Guardar */}
      <div className="flex-shrink-0 mt-6 pt-4 border-t" style={{ borderColor: 'var(--color-acero-claro)' }}>
        <button
          onClick={guardar}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          style={{ background: 'var(--color-granito)', color: 'white' }}
        >
          {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando…</> : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
