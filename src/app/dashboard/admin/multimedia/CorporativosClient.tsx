'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, Loader2, CheckCircle } from 'lucide-react'
import Image from 'next/image'

const CLAVES = {
  izquierda: 'corporativos_foto_izquierda',
  derecha: 'corporativos_foto_derecha',
} as const

type Lado = keyof typeof CLAVES

interface SlotProps {
  lado: Lado
  label: string
  supabaseUrl: string
}

function FotoSlot({ lado, label, supabaseUrl }: SlotProps) {
  const supabase = createClient()
  const [path, setPath] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('configuracion')
        .select('valor')
        .eq('clave', CLAVES[lado])
        .single()
      setPath(data?.valor || null)
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line

  function toast_(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function optimizar(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const MAX = 1400
        let { width, height } = img
        if (width > MAX || height > MAX) {
          if (width >= height) { height = Math.round((height * MAX) / width); width = MAX }
          else { width = Math.round((width * MAX) / height); height = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob')), 'image/webp', 0.85)
      }
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load')) }
      img.src = url
    })
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSaving(true)

    let blob: Blob
    try { blob = await optimizar(file) } catch {
      toast_('Error al procesar imagen')
      setSaving(false)
      return
    }

    // eliminar anterior si existe
    if (path) await supabase.storage.from('multimedia').remove([path])

    const newPath = `corporativos/trabajos/${lado}-${Date.now()}.webp`
    const { error } = await supabase.storage
      .from('multimedia')
      .upload(newPath, blob, { contentType: 'image/webp', upsert: false })

    if (error) {
      toast_(`Error al subir: ${error.message}`)
      setSaving(false)
      return
    }

    // upsert en configuracion
    await supabase.from('configuracion').upsert(
      { clave: CLAVES[lado], valor: newPath },
      { onConflict: 'clave' }
    )

    setPath(newPath)
    setSaving(false)
    toast_('Foto guardada')
    e.target.value = ''
  }

  async function eliminar() {
    if (!path) return
    await supabase.storage.from('multimedia').remove([path])
    await supabase.from('configuracion').upsert(
      { clave: CLAVES[lado], valor: '' },
      { onConflict: 'clave' }
    )
    setPath(null)
    setConfirmar(false)
    toast_('Foto eliminada')
  }

  const publicUrl = path ? `${supabaseUrl}/storage/v1/object/public/multimedia/${path}` : null

  return (
    <div className="flex flex-col gap-3">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-base"
          style={{ background: 'var(--color-granito)', color: 'white' }}>
          <CheckCircle size={15} /> {toast}
        </div>
      )}

      <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{label}</p>

      {loading ? (
        <div className="flex items-center justify-center h-48 rounded-xl border" style={{ borderColor: 'var(--color-acero-claro)' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-acero-oscuro)' }} />
        </div>
      ) : publicUrl ? (
        <div className="relative rounded-xl overflow-hidden border aspect-[3/4] group"
          style={{ borderColor: 'var(--color-acero-claro)' }}>
          <Image src={publicUrl} alt={label} fill className="object-cover" sizes="300px" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'white', color: 'var(--color-granito-oscuro)' }}
            >
              {saving ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}
              Reemplazar
            </button>
            <button
              onClick={() => setConfirmar(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: '#ef4444', color: 'white' }}
            >
              <X size={12} className="inline mr-1" />
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-16 cursor-pointer transition-colors"
          style={{ borderColor: 'var(--color-acero-claro)' }}
        >
          {saving ? (
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-acero-oscuro)' }} />
          ) : (
            <>
              <Upload size={20} strokeWidth={1.5} style={{ color: 'var(--color-acero-oscuro)' }} />
              <p className="text-sm mt-2" style={{ color: 'var(--color-acero-oscuro)' }}>Subir foto</p>
              <p className="text-xs mt-1 opacity-60" style={{ color: 'var(--color-acero-oscuro)' }}>JPG, PNG o WEBP</p>
            </>
          )}
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />

      {confirmar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmar(false)} />
          <div className="relative bg-white rounded-xl p-6 shadow-2xl max-w-sm mx-4 z-10">
            <p className="text-base font-medium mb-1" style={{ color: 'var(--foreground)' }}>¿Quitar esta foto?</p>
            <p className="text-sm mb-5" style={{ color: 'var(--color-acero-oscuro)' }}>Se eliminará permanentemente.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmar(false)} className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ color: 'var(--color-acero-oscuro)', background: 'var(--color-acero-brillo)' }}>
                Cancelar
              </button>
              <button onClick={eliminar} className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: '#ef4444', color: 'white' }}>
                Quitar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function CorporativosClient({ supabaseUrl }: { supabaseUrl: string }) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-shrink-0 mb-6">
        <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
          Estas fotos aparecen a los costados del formulario de Corporativos en la página pública.
          Recomendado: fotos verticales de trabajos realizados, aprox. 600×900px.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-2xl">
        <FotoSlot lado="izquierda" label="Foto izquierda" supabaseUrl={supabaseUrl} />
        <FotoSlot lado="derecha" label="Foto derecha" supabaseUrl={supabaseUrl} />
      </div>
    </div>
  )
}
