'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle, RotateCcw } from 'lucide-react'

interface ColorItem {
  clave: string
  label: string
  descripcion: string
  default: string
  grupo: 'acero' | 'granito' | 'general'
}

const COLORES: ColorItem[] = [
  { clave: 'diseno_acero_brillo', label: 'Fondo claro', descripcion: 'Cards, secciones claras, fondos secundarios', default: '#ECEEF1', grupo: 'acero' },
  { clave: 'diseno_acero_claro', label: 'Bordes suaves', descripcion: 'Bordes de inputs, separadores, tabs', default: '#D4D9E0', grupo: 'acero' },
  { clave: 'diseno_acero', label: 'Texto gris', descripcion: 'Textos secundarios, íconos, placeholders', default: '#A8B0BB', grupo: 'acero' },
  { clave: 'diseno_acero_oscuro', label: 'Texto secundario', descripcion: 'Subtítulos, etiquetas, fechas', default: '#6E7882', grupo: 'acero' },
  { clave: 'diseno_granito_claro', label: 'Bordes', descripcion: 'Bordes principales, separadores', default: '#5A5F66', grupo: 'granito' },
  { clave: 'diseno_granito', label: 'Botones / fondos', descripcion: 'Botones oscuros, fondos de secciones', default: '#2E3135', grupo: 'granito' },
  { clave: 'diseno_granito_oscuro', label: 'Títulos / textos', descripcion: 'Títulos, texto principal', default: '#111316', grupo: 'granito' },
  { clave: 'diseno_background', label: 'Fondo página', descripcion: 'Fondo general de toda la página', default: '#F0F1F3', grupo: 'general' },
]

const LABEL_GRUPO: Record<string, string> = {
  acero: 'ACERO — Tonos metálicos claros',
  granito: 'GRANITO — Tonos oscuros',
  general: 'GENERAL',
}

function getCSSVar(clave: string): string {
  const map: Record<string, string> = {
    diseno_acero_brillo: '--color-acero-brillo',
    diseno_acero_claro: '--color-acero-claro',
    diseno_acero: '--color-acero',
    diseno_acero_oscuro: '--color-acero-oscuro',
    diseno_granito_claro: '--color-granito-claro',
    diseno_granito: '--color-granito',
    diseno_granito_oscuro: '--color-granito-oscuro',
    diseno_background: '--background',
  }
  return map[clave] ?? ''
}

function applyColors(colores: Record<string, string>) {
  const root = document.documentElement
  for (const [clave, valor] of Object.entries(colores)) {
    const cssVar = getCSSVar(clave)
    if (cssVar) root.style.setProperty(cssVar, valor)
  }
}

function restoreDefaults() {
  const root = document.documentElement
  for (const c of COLORES) {
    const cssVar = getCSSVar(c.clave)
    if (cssVar) root.style.removeProperty(cssVar)
  }
}

export function DisenoClient() {
  const supabase = createClient()
  const [colores, setColores] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('configuracion')
        .select('clave, valor')
        .in('clave', COLORES.map(c => c.clave))

      const loaded: Record<string, string> = {}
      for (const c of COLORES) {
        const row = data?.find(r => r.clave === c.clave)
        loaded[c.clave] = row?.valor || c.default
      }
      setColores(loaded)
      applyColors(loaded)
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line

  function handleChange(clave: string, valor: string) {
    const nuevos = { ...colores, [clave]: valor }
    setColores(nuevos)
    applyColors(nuevos)
  }

  async function guardar() {
    setSaving(true)
    for (const [clave, valor] of Object.entries(colores)) {
      const c = COLORES.find(c => c.clave === clave)
      const finalValor = valor || c?.default || ''
      await supabase
        .from('configuracion')
        .upsert({ clave, valor: finalValor }, { onConflict: 'clave' })
    }
    setSaving(false)
    setToast('Colores guardados correctamente')
    setTimeout(() => setToast(null), 3000)
  }

  async function restaurar() {
    for (const c of COLORES) {
      await supabase.from('configuracion').delete().eq('clave', c.clave)
    }
    const defaults: Record<string, string> = {}
    for (const c of COLORES) defaults[c.clave] = c.default
    setColores(defaults)
    restoreDefaults()
    setToast('Colores restaurados a valores originales')
    setTimeout(() => setToast(null), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-acero-oscuro)' }} />
      </div>
    )
  }

  const grupos = ['acero', 'granito', 'general'] as const

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
          Personalizá los colores de toda la página. Los cambios se ven en tiempo real.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-xl space-y-8 pb-6">
          {grupos.map(grupo => (
            <div key={grupo}>
              <p className="text-xs tracking-widest uppercase font-medium mb-4" style={{ color: 'var(--color-acero-oscuro)' }}>
                {LABEL_GRUPO[grupo]}
              </p>
              <div className="space-y-3">
                {COLORES.filter(c => c.grupo === grupo).map(c => (
                  <div
                    key={c.clave}
                    className="flex items-center gap-4 p-3 rounded-lg border"
                    style={{ borderColor: 'var(--color-acero-claro)' }}
                  >
                    <input
                      ref={el => { inputRefs.current[c.clave] = el }}
                      type="color"
                      value={colores[c.clave] || c.default}
                      onChange={e => handleChange(c.clave, e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border-0 p-0.5"
                      style={{ background: 'transparent' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                        {c.label}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                        {c.descripcion}
                      </p>
                    </div>
                    <input
                      type="text"
                      value={colores[c.clave] || c.default}
                      onChange={e => handleChange(c.clave, e.target.value)}
                      className="w-24 px-2 py-1 text-xs font-mono rounded border text-center"
                      style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)', background: 'white' }}
                    />
                    <div
                      onClick={() => inputRefs.current[c.clave]?.click()}
                      className="w-8 h-8 rounded-full border flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
                      style={{ background: colores[c.clave] || c.default, borderColor: 'var(--color-acero-claro)' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-shrink-0 mt-6 flex items-center gap-3 pt-4 border-t" style={{ borderColor: 'var(--color-acero-claro)' }}>
        <button
          onClick={guardar}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          style={{ background: 'var(--color-granito)', color: 'white' }}
        >
          {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando…</> : 'Guardar colores'}
        </button>
        <button
          onClick={restaurar}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{ color: 'var(--color-acero-oscuro)', background: 'var(--color-acero-brillo)' }}
        >
          <RotateCcw size={14} />
          Restaurar originales
        </button>
      </div>
    </div>
  )
}
