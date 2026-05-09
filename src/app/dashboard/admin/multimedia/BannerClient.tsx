'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, Loader2, CheckCircle, Star } from 'lucide-react'
import Image from 'next/image'

interface Banner {
  id: number
  url: string
  titulo: string | null
  link_url: string | null
  activo: boolean
  created_at: string
}

export function BannerClient({
  supabaseUrl,
}: {
  supabaseUrl: string
}) {
  const supabase = createClient()
  const [banner, setBanner] = useState<Banner | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [titulo, setTitulo] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('banners')
        .select('*')
        .order('id', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        setBanner(data)
        setTitulo(data.titulo ?? '')
        setLinkUrl(data.link_url ?? '')
      }
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  async function guardar() {
    if (!pendingFile && !banner) return
    setSaving(true)

    let url = banner?.url ?? ''

    if (pendingFile && previewUrl) {
      URL.revokeObjectURL(previewUrl)
      const ext = 'webp'
      const path = `banners/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('multimedia')
        .upload(path, pendingFile, { contentType: 'image/webp', upsert: false })

      if (uploadError) {
        mostrarToast(`Error al subir: ${uploadError.message}`)
        setSaving(false)
        return
      }

      // Eliminar imagen anterior si existe
      if (banner?.url) {
        await supabase.storage.from('multimedia').remove([banner.url])
      }

      url = path
    }

    const payload = {
      url,
      titulo: titulo || null,
      link_url: linkUrl || null,
      activo: true,
    }

    if (banner) {
      await supabase.from('banners').update(payload).eq('id', banner.id)
    } else {
      const { data } = await supabase.from('banners').insert(payload).select().single()
      if (data) setBanner(data)
    }

    setPendingFile(null)
    setPreviewUrl(null)
    setBanner(prev => prev ? { ...prev, ...payload } : null)
    setSaving(false)
    mostrarToast('Banner guardado correctamente')
  }

  async function toggleActivo() {
    if (!banner) return
    const nuevo = !banner.activo
    await supabase.from('banners').update({ activo: nuevo }).eq('id', banner.id)
    setBanner(prev => prev ? { ...prev, activo: nuevo } : null)
    mostrarToast(nuevo ? 'Banner activado' : 'Banner desactivado')
  }

  async function eliminar() {
    if (!banner) return
    await supabase.storage.from('multimedia').remove([banner.url])
    await supabase.from('banners').delete().eq('id', banner.id)
    setBanner(null)
    setTitulo('')
    setLinkUrl('')
    setConfirmarEliminar(false)
    mostrarToast('Banner eliminado')
  }

  const getPublicUrl = (url: string) => `${supabaseUrl}/storage/v1/object/public/multimedia/${url}`

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-acero-oscuro)' }} />
      </div>
    )
  }

  const imagenUrl = previewUrl || (banner ? getPublicUrl(banner.url) : null)

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
          Subí la imagen del banner promocional que se muestra antes del footer en la página principal.
          {banner ? ' Reemplazá la imagen o editá la información abajo.' : ' Aún no hay banner subido.'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-2xl space-y-6 pb-6">

          {/* Preview / Upload */}
          {imagenUrl ? (
            <div className="relative rounded-xl overflow-hidden border aspect-video"
              style={{ borderColor: 'var(--color-acero-claro)' }}>
              <Image src={imagenUrl} alt="Banner" fill className="object-cover" />
              <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center">
                <button
                  onClick={() => inputRef.current?.click()}
                  className="opacity-0 hover:opacity-100 px-4 py-2 rounded-lg text-sm font-medium transition-opacity"
                  style={{ background: 'white', color: 'var(--color-granito-oscuro)' }}
                >
                  {pendingFile ? 'Cambiar imagen' : 'Reemplazar imagen'}
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => inputRef.current?.click()}
              className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-16 cursor-pointer transition-colors"
              style={{ borderColor: 'var(--color-acero-claro)' }}
            >
              <Upload size={24} strokeWidth={1.5} style={{ color: 'var(--color-acero-oscuro)' }} />
              <p className="text-sm mt-2" style={{ color: 'var(--color-acero-oscuro)' }}>
                Hacé click para seleccionar una imagen
              </p>
              <p className="text-xs mt-1 opacity-60" style={{ color: 'var(--color-acero-oscuro)' }}>
                Recomendado: 1200×400px, JPG o PNG
              </p>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFile}
          />

          {/* Título */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-acero-oscuro)' }}>
              Título (texto alternativo)
            </label>
            <input
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ej: Promo Día del Padre — 20% OFF"
              className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
              style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
            />
          </div>

          {/* Link */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-acero-oscuro)' }}>
              Link (opcional) <span className="font-normal">— al clickear, redirige a esta URL</span>
            </label>
            <input
              type="text"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder="/tienda o https://..."
              className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
              style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
            />
          </div>

        </div>
      </div>

      {/* Acciones */}
      <div className="flex-shrink-0 mt-6 pt-4 border-t flex items-center gap-3 flex-wrap"
        style={{ borderColor: 'var(--color-acero-claro)' }}>
        <button
          onClick={guardar}
          disabled={saving || (!pendingFile && !banner)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          style={{ background: 'var(--color-granito)', color: 'white' }}
        >
          {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando…</> : 'Guardar cambios'}
        </button>

        {banner && (
          <>
            <button
              onClick={toggleActivo}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: banner.activo ? '#fef3c7' : 'var(--color-acero-brillo)',
                color: banner.activo ? '#92400e' : 'var(--color-acero-oscuro)',
              }}
            >
              <Star size={14} fill={banner.activo ? 'currentColor' : 'none'} />
              {banner.activo ? 'Visible en la web' : 'Oculto'}
            </button>

            <button
              onClick={() => setConfirmarEliminar(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ml-auto"
              style={{ color: '#ef4444', background: '#fef2f2' }}
            >
              <X size={14} />
              Eliminar banner
            </button>
          </>
        )}
      </div>

      {/* Confirmación de eliminación */}
      {confirmarEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmarEliminar(false)} />
          <div className="relative bg-white rounded-xl p-6 shadow-2xl max-w-sm mx-4 z-10">
            <p className="text-base font-medium mb-1" style={{ color: 'var(--foreground)' }}>
              ¿Eliminar este banner?
            </p>
            <p className="text-sm mb-5" style={{ color: 'var(--color-acero-oscuro)' }}>
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmarEliminar(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ color: 'var(--color-acero-oscuro)', background: 'var(--color-acero-brillo)' }}
              >
                Cancelar
              </button>
              <button
                onClick={eliminar}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ background: '#ef4444', color: 'white' }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
