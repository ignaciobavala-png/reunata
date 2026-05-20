'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, Loader2, CheckCircle, Star, ChevronLeft, Play, ImageIcon, Pencil, ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import { BannerClient } from './BannerClient'

interface HeroAsset {
  id: number
  tipo: 'imagen' | 'video'
  url: string
  orden: number
  activo: boolean
  etiqueta: string | null
  titulo: string | null
  subtitulo: string | null
  boton_texto: string | null
  boton_url: string | null
}

interface ArchivoPreview { file: File; previewUrl: string; tipo: 'imagen' | 'video' }

export function HeroClient({
  assetsIniciales,
  supabaseUrl,
  supabaseKey,
  isMaster,
  initialSubtab = 'carrusel',
}: {
  assetsIniciales: HeroAsset[]
  supabaseUrl: string
  supabaseKey: string
  isMaster: boolean
  initialSubtab?: 'carrusel' | 'banner'
}) {
  const supabase = createClient()
  const [subtab, setSubtab] = useState<'carrusel' | 'banner'>(initialSubtab)
  const [assets, setAssets] = useState<HeroAsset[]>(assetsIniciales)
  const [pendingFiles, setPendingFiles] = useState<ArchivoPreview[]>([])
  const [subiendo, setSubiendo] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [assetAEliminar, setAssetAEliminar] = useState<HeroAsset | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<HeroAsset | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const activos = assets.filter(a => a.activo).length
  const sorted = [...assets].sort((a, b) => a.orden - b.orden)

  const getPublicUrl = (url: string) => `${supabaseUrl}/storage/v1/object/public/multimedia/${url}`

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  function handleFileSelect(archivos: FileList | File[]) {
    const lista = Array.from(archivos).map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
      tipo: file.type.startsWith('video/') ? 'video' as const : 'imagen' as const,
    }))
    setPendingFiles(prev => [...prev, ...lista])
  }

  function removePending(idx: number) {
    setPendingFiles(prev => {
      URL.revokeObjectURL(prev[idx].previewUrl)
      return prev.filter((_, i) => i !== idx)
    })
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files)
  }, [])

  async function optimizarImagen(archivo: File): Promise<Blob> {
    const MAX_LADO = 1920
    const CALIDAD = 0.85
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      const url = URL.createObjectURL(archivo)
      img.onload = () => {
        URL.revokeObjectURL(url)
        let { width, height } = img
        if (width > MAX_LADO || height > MAX_LADO) {
          if (width >= height) { height = Math.round((height * MAX_LADO) / width); width = MAX_LADO }
          else { width = Math.round((width * MAX_LADO) / height); height = MAX_LADO }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob falló')), 'image/webp', CALIDAD)
      }
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo cargar')) }
      img.src = url
    })
  }

  async function confirmarSubida() {
    if (subiendo || pendingFiles.length === 0) return
    setSubiendo(true)
    const nuevos: HeroAsset[] = []

    for (const { file, tipo } of pendingFiles) {
      let ext: string
      let blob: Blob | File = file

      if (tipo === 'imagen') {
        try { blob = await optimizarImagen(file) } catch { continue }
        ext = 'webp'
      } else {
        ext = file.name.split('.').pop() ?? 'mp4'
      }

      const path = `hero/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('multimedia')
        .upload(path, blob, { contentType: tipo === 'imagen' ? 'image/webp' : file.type, upsert: false })
      if (uploadError) {
        console.error(uploadError)
        mostrarToast(`Error al subir "${file.name}": ${uploadError.message}`)
        setSubiendo(false)
        return
      }

      const maxOrden = assets.reduce((max, a) => Math.max(max, a.orden), 0)
      const { data } = await supabase
        .from('hero_assets')
        .insert({ tipo, url: path, orden: maxOrden + nuevos.length + 1 })
        .select()
        .single()
      if (data) nuevos.push(data)
    }

    pendingFiles.forEach(f => URL.revokeObjectURL(f.previewUrl))
    setPendingFiles([])
    setAssets(prev => [...prev, ...nuevos])
    setSubiendo(false)
    mostrarToast(`${nuevos.length} asset${nuevos.length !== 1 ? 's' : ''} subido${nuevos.length !== 1 ? 's' : ''}`)
  }

  async function toggleActivo(asset: HeroAsset) {
    const nuevoValor = !asset.activo
    await supabase.from('hero_assets').update({ activo: nuevoValor }).eq('id', asset.id)
    setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, activo: nuevoValor } : a))
  }

  function pedirEliminar(asset: HeroAsset) {
    setAssetAEliminar(asset)
  }

  async function confirmarEliminar() {
    if (!assetAEliminar) return
    await supabase.storage.from('multimedia').remove([assetAEliminar.url])
    await supabase.from('hero_assets').delete().eq('id', assetAEliminar.id)
    setAssets(prev => prev.filter(a => a.id !== assetAEliminar.id))
    setAssetAEliminar(null)
    if (selectedAsset?.id === assetAEliminar.id) setSelectedAsset(null)
    mostrarToast('Asset eliminado')
  }

  async function reordenar(asset: HeroAsset, direccion: 'up' | 'down') {
    const idx = sorted.findIndex(a => a.id === asset.id)
    const otro = direccion === 'up' ? sorted[idx - 1] : sorted[idx + 1]
    if (!otro) return

    await supabase.from('hero_assets').update({ orden: otro.orden }).eq('id', asset.id)
    setAssets(prev => prev.map(a => {
      if (a.id === asset.id) return { ...a, orden: otro.orden }
      if (a.id === otro.id) return { ...a, orden: asset.orden }
      return a
    }))
  }

  async function guardarContenido(asset: HeroAsset) {
    const payload = {
      etiqueta: asset.etiqueta,
      titulo: asset.titulo,
      subtitulo: asset.subtitulo,
      boton_texto: asset.boton_texto,
      boton_url: asset.boton_url,
    }
    await supabase.from('hero_assets').update(payload).eq('id', asset.id)
    setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, ...payload } : a))
    setSelectedAsset(a => a?.id === asset.id ? { ...a, ...payload } : a)
  }

  function abrirEditor(asset: HeroAsset) {
    setSelectedAsset({ ...asset })
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

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit" style={{ background: 'var(--color-acero-brillo)' }}>
        {([
          { key: 'carrusel', label: 'Carrusel hero' },
          { key: 'banner', label: 'Banner promocional' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSubtab(key)}
            className="px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150"
            style={{
              background: subtab === key ? 'white' : 'transparent',
              color: subtab === key ? 'var(--foreground)' : 'var(--color-acero-oscuro)',
              boxShadow: subtab === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {subtab === 'banner' ? (
        <BannerClient supabaseUrl={supabaseUrl} />
      ) : (
      <>

      <div className="flex-shrink-0 mb-6">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
              <span className="font-semibold" style={{ color: 'var(--foreground)' }}>{activos}</span>
              {' '}/ {assets.length} activos
            </p>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-acero-claro)' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${assets.length > 0 ? (activos / assets.length) * 100 : 0}%`, background: 'var(--color-granito)' }} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-6">
          {sorted.map(a => {
            const idx = sorted.findIndex(s => s.id === a.id)
            return (
              <div key={a.id} className="flex flex-col" style={{ opacity: a.activo ? 1 : 0.5 }}>
                <div
                  onClick={() => abrirEditor(a)}
                  className="relative group rounded-t-lg overflow-hidden aspect-video border-x border-t cursor-pointer"
                  style={{ borderColor: a.activo ? 'var(--color-granito)' : 'var(--color-acero-claro)' }}>
                  {a.tipo === 'imagen' ? (
                    <Image src={getPublicUrl(a.url)} alt="" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-black/80">
                      <Play size={32} className="text-white/60" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                    {idx > 0 && (
                      <button onClick={e => { e.stopPropagation(); reordenar(a, 'up') }} className="p-1.5 rounded-full bg-white/20 hover:bg-white/40" title="Mover arriba">
                        <ChevronLeft size={14} className="text-white rotate-90" />
                      </button>
                    )}
                    <button onClick={e => { e.stopPropagation(); toggleActivo(a) }} className="p-1.5 rounded-full bg-white/20 hover:bg-amber-400" title={a.activo ? 'Ocultar del hero' : 'Mostrar en hero'}>
                      <Star size={14} className="text-white" fill={a.activo ? 'white' : 'none'} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); pedirEliminar(a) }} className="p-1.5 rounded-full bg-white/20 hover:bg-red-500">
                      <X size={14} className="text-white" />
                    </button>
                    {idx < sorted.length - 1 && (
                      <button onClick={e => { e.stopPropagation(); reordenar(a, 'down') }} className="p-1.5 rounded-full bg-white/20 hover:bg-white/40" title="Mover abajo">
                        <ChevronLeft size={14} className="text-white -rotate-90" />
                      </button>
                    )}
                  </div>

                  <span className="absolute bottom-2 left-2 text-sm bg-black/50 text-white px-1.5 py-0.5 rounded font-mono">{idx + 1}</span>
                  {a.tipo === 'video' && (
                    <span className="absolute top-2 right-2 text-sm bg-black/50 text-white px-1.5 py-0.5 rounded">video</span>
                  )}
                  {a.activo && (
                    <span className="absolute top-2 left-2"><Star size={12} className="text-amber-400" fill="currentColor" /></span>
                  )}
                </div>
                <button
                  onClick={() => abrirEditor(a)}
                  className="flex items-center justify-center gap-1.5 py-1.5 rounded-b-lg border text-xs font-medium transition-colors hover:opacity-80"
                  style={{ borderColor: a.activo ? 'var(--color-granito)' : 'var(--color-acero-claro)', background: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}
                >
                  <Pencil size={11} />
                  Editar contenido
                </button>
              </div>
            )
          })}

          <button
            onClick={() => inputRef.current?.click()}
            className="aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors hover:border-[var(--color-granito)]"
            style={{ borderColor: 'var(--color-acero-claro)' }}
          >
            <Upload size={20} style={{ color: 'var(--color-acero-oscuro)' }} />
            <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Subir imagen o video</span>
          </button>
        </div>

        <div
          onDragOver={e => e.preventDefault()}
          onDrop={onDrop}
          className="rounded-xl border-2 border-dashed p-4 mb-4"
          style={{ borderColor: 'var(--color-acero-claro)' }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
              {pendingFiles.length > 0 ? `${pendingFiles.length} archivo${pendingFiles.length !== 1 ? 's' : ''} pendiente${pendingFiles.length !== 1 ? 's' : ''}` : 'Arrastrá archivos acá o usá el botón +'}
            </p>
            {pendingFiles.length > 0 && (
              <div className="flex gap-2 flex-wrap items-center">
                {pendingFiles.map((pf, i) => (
                  <div key={i} className="relative w-12 h-12 rounded overflow-hidden bg-black/10">
                    {pf.tipo === 'imagen' ? (
                      <Image src={pf.previewUrl} alt="" fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play size={14} className="text-gray-400" />
                      </div>
                    )}
                    <button onClick={() => removePending(i)} className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5">
                      <X size={10} className="text-white" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={confirmarSubida}
                  disabled={subiendo}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                  style={{ background: 'var(--color-granito)', color: 'white' }}
                >
                  {subiendo ? <><Loader2 size={12} className="animate-spin" /> Subiendo…</> : <><Upload size={12} /> Subir</>}
                </button>
              </div>
            )}
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm"
          multiple
          className="hidden"
          onChange={e => e.target.files && handleFileSelect(e.target.files)}
        />
      </div>

      {/* Confirmación de eliminación */}
      {assetAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAssetAEliminar(null)} />
          <div className="relative bg-white rounded-xl p-6 shadow-2xl max-w-sm mx-4 z-10">
            <p className="text-base font-medium mb-1" style={{ color: 'var(--foreground)' }}>¿Eliminar este asset?</p>
            <p className="text-sm mb-5" style={{ color: 'var(--color-acero-oscuro)' }}>Esta acción no se puede deshacer.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setAssetAEliminar(null)} className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ color: 'var(--color-acero-oscuro)', background: 'var(--color-acero-brillo)' }}>Cancelar</button>
              <button onClick={confirmarEliminar} className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: '#ef4444', color: 'white' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer — Editar contenido */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedAsset(null)} />
          <div className="relative w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl animate-slide-in">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center gap-3 z-10" style={{ borderColor: 'var(--color-acero-claro)' }}>
              <button onClick={() => setSelectedAsset(null)} className="p-1 -ml-1 rounded hover:bg-gray-100">
                <ArrowLeft size={18} style={{ color: 'var(--color-acero-oscuro)' }} />
              </button>
              <div>
                <h3 className="text-base font-medium" style={{ color: 'var(--foreground)' }}>Editar contenido</h3>
                <p className="text-base" style={{ color: 'var(--color-acero-oscuro)' }}>
                  Asset #{selectedAsset.id} — {selectedAsset.tipo === 'video' ? 'Video' : 'Imagen'}
                </p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Preview */}
              <div className="relative aspect-video rounded-lg overflow-hidden bg-black/5">
                {selectedAsset.tipo === 'imagen' ? (
                  <Image src={getPublicUrl(selectedAsset.url)} alt="" fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-black/80">
                    <Play size={32} className="text-white/60" />
                  </div>
                )}
              </div>

              {/* Etiqueta */}
              <div>
                <label className="block text-base font-medium mb-1.5" style={{ color: 'var(--color-acero-oscuro)' }}>
                  Etiqueta <span className="font-normal text-sm">(ej: Nueva Colección 2025)</span>
                </label>
                <input
                  type="text"
                  value={selectedAsset.etiqueta ?? ''}
                  onChange={e => setSelectedAsset(prev => prev ? { ...prev, etiqueta: e.target.value || null } : null)}
                  placeholder='Ej: Nueva Colección — 2025'
                  className="w-full px-3 py-2.5 rounded-lg border text-base focus:outline-none focus:ring-1"
                  style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
                />
              </div>

              {/* Título */}
              <div>
                <label className="block text-base font-medium mb-1.5" style={{ color: 'var(--color-acero-oscuro)' }}>
                  Título principal
                </label>
                <input
                  type="text"
                  value={selectedAsset.titulo ?? ''}
                  onChange={e => setSelectedAsset(prev => prev ? { ...prev, titulo: e.target.value || null } : null)}
                  placeholder='Ej: El mate que te une.'
                  className="w-full px-3 py-2.5 rounded-lg border text-base focus:outline-none focus:ring-1"
                  style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
                />
              </div>

              {/* Subtítulo */}
              <div>
                <label className="block text-base font-medium mb-1.5" style={{ color: 'var(--color-acero-oscuro)' }}>
                  Subtítulo
                </label>
                <textarea
                  value={selectedAsset.subtitulo ?? ''}
                  onChange={e => setSelectedAsset(prev => prev ? { ...prev, subtitulo: e.target.value || null } : null)}
                  rows={3}
                  placeholder='Ej: Productos importados, diseñados para quienes toman el mate en serio.'
                  className="w-full px-3 py-2.5 rounded-lg border text-base focus:outline-none focus:ring-1 resize-none"
                  style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
                />
              </div>

              {/* Botón */}
              <div>
                <label className="block text-base font-medium mb-1.5" style={{ color: 'var(--color-acero-oscuro)' }}>
                  Botón
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={selectedAsset.boton_texto ?? ''}
                    onChange={e => setSelectedAsset(prev => prev ? { ...prev, boton_texto: e.target.value || null } : null)}
                    placeholder='Texto del botón'
                    className="flex-1 px-3 py-2.5 rounded-lg border text-base focus:outline-none focus:ring-1"
                    style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
                  />
                  <input
                    type="text"
                    value={selectedAsset.boton_url ?? ''}
                    onChange={e => setSelectedAsset(prev => prev ? { ...prev, boton_url: e.target.value || null } : null)}
                    placeholder='/tienda'
                    className="flex-1 px-3 py-2.5 rounded-lg border text-base focus:outline-none focus:ring-1"
                    style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
                  />
                </div>
              </div>

              <button
                onClick={() => guardarContenido(selectedAsset)}
                className="w-full px-4 py-3 rounded-lg text-base font-medium transition-colors"
                style={{ background: 'var(--color-granito)', color: 'white' }}
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  )
}
