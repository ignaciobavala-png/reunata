'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, ImageIcon, Loader2, CheckCircle, Star, ChevronLeft } from 'lucide-react'
import Image from 'next/image'

export interface FotoItem {
  id: number
  producto_id: number
  url: string
  orden: number
  destacada: boolean
}

interface Producto {
  id: number
  codigo_interno: string
  titulo: string
}

interface Props {
  producto: Producto
  fotosIniciales: FotoItem[]
  supabaseUrl: string
  isMaster: boolean
  onClose: () => void
  onFotosChange?: (productoId: number, fotos: FotoItem[]) => void
}

export function ProductoFotosDrawer({ producto, fotosIniciales, supabaseUrl, isMaster, onClose, onFotosChange }: Props) {
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const [fotos, setFotos] = useState<FotoItem[]>(fotosIniciales)
  const [pendingFiles, setPendingFiles] = useState<{ file: File; previewUrl: string }[]>([])
  const [subiendo, setSubiendo] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [fotoAEliminar, setFotoAEliminar] = useState<FotoItem | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fotosOrdenadas = [...fotos].sort((a, b) => a.orden - b.orden)

  const getPublicUrl = (url: string) => `${supabaseUrl}/storage/v1/object/public/multimedia/${url}`

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    return () => { pendingFiles.forEach(f => URL.revokeObjectURL(f.previewUrl)) }
  }, []) // eslint-disable-line

  function handleFileSelect(archivos: FileList | File[]) {
    const lista = Array.from(archivos).filter(f => f.type.startsWith('image/'))
    setPendingFiles(prev => [...prev, ...lista.map(file => ({ file, previewUrl: URL.createObjectURL(file) }))])
  }

  function removePending(idx: number) {
    setPendingFiles(prev => {
      URL.revokeObjectURL(prev[idx].previewUrl)
      return prev.filter((_, i) => i !== idx)
    })
  }

  async function optimizarImagen(archivo: File): Promise<Blob> {
    const MAX_LADO = 1920
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
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob falló')), 'image/webp', 0.85)
      }
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo cargar')) }
      img.src = url
    })
  }

  async function confirmarSubida() {
    if (subiendo || pendingFiles.length === 0) return
    setSubiendo(true)
    const supabase = getSupabase()
    const nuevasFotos: FotoItem[] = []

    for (const { file } of pendingFiles) {
      let blob: Blob
      try { blob = await optimizarImagen(file) } catch { continue }

      const path = `productos/${producto.codigo_interno}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.webp`
      const { error: uploadError } = await supabase.storage
        .from('multimedia')
        .upload(path, blob, { contentType: 'image/webp', upsert: false })
      if (uploadError) { console.error(uploadError); continue }

      const orden = fotosOrdenadas.length + nuevasFotos.length
      const { data: fotoData } = await supabase
        .from('producto_fotos')
        .insert({ producto_id: producto.id, url: path, orden })
        .select()
        .single()
      if (fotoData) nuevasFotos.push(fotoData)
    }

    pendingFiles.forEach(f => URL.revokeObjectURL(f.previewUrl))
    setPendingFiles([])
    const actualizadas = [...fotos, ...nuevasFotos]
    setFotos(actualizadas)
    onFotosChange?.(producto.id, actualizadas)
    setSubiendo(false)
    mostrarToast(`${nuevasFotos.length} foto${nuevasFotos.length !== 1 ? 's' : ''} subida${nuevasFotos.length !== 1 ? 's' : ''} correctamente`)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files)
  }, []) // eslint-disable-line

  async function toggleDestacada(foto: FotoItem) {
    const nuevoValor = !foto.destacada
    await fetch('/api/multimedia', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Is-Master': isMaster ? 'true' : 'false' },
      body: JSON.stringify({ id: foto.id, destacada: nuevoValor }),
    })
    const actualizadas = fotos.map(f => f.id === foto.id ? { ...f, destacada: nuevoValor } : f)
    setFotos(actualizadas)
    onFotosChange?.(producto.id, actualizadas)
  }

  async function confirmarEliminar() {
    if (!fotoAEliminar) return
    await fetch('/api/multimedia', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'X-Is-Master': isMaster ? 'true' : 'false' },
      body: JSON.stringify({ path: fotoAEliminar.url, fotoId: fotoAEliminar.id }),
    })
    const actualizadas = fotos.filter(f => f.id !== fotoAEliminar.id)
    setFotos(actualizadas)
    onFotosChange?.(producto.id, actualizadas)
    setFotoAEliminar(null)
    mostrarToast('Foto eliminada')
  }

  async function reordenarFoto(foto: FotoItem, direccion: 'up' | 'down') {
    const idx = fotosOrdenadas.findIndex(f => f.id === foto.id)
    const otra = direccion === 'up' ? fotosOrdenadas[idx - 1] : fotosOrdenadas[idx + 1]
    if (!otra) return
    await fetch('/api/multimedia', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Is-Master': isMaster ? 'true' : 'false' },
      body: JSON.stringify({ id: foto.id, orden: otra.orden }),
    })
    const actualizadas = fotos.map(f => {
      if (f.id === foto.id) return { ...f, orden: otra.orden }
      if (f.id === otra.id) return { ...f, orden: foto.orden }
      return f
    })
    setFotos(actualizadas)
    onFotosChange?.(producto.id, actualizadas)
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-white z-50 shadow-2xl flex flex-col" style={{ maxWidth: '100vw' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0" style={{ borderColor: 'var(--color-acero-claro)' }}>
          <div className="min-w-0">
            <p className="font-medium text-base truncate" style={{ color: 'var(--foreground)' }}>{producto.titulo}</p>
            <p className="text-sm font-mono" style={{ color: 'var(--color-acero-oscuro)' }}>{producto.codigo_interno}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} style={{ color: 'var(--color-acero-oscuro)' }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Drop zone */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-4 mb-4 cursor-pointer"
            style={{ borderColor: 'var(--color-acero-claro)' }}
          >
            <Upload size={18} strokeWidth={1.5} style={{ color: 'var(--color-acero-oscuro)' }} />
            <p className="text-sm mt-1.5" style={{ color: 'var(--color-acero-oscuro)' }}>
              Arrastrá fotos o click para seleccionar
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              className="hidden"
              onChange={e => e.target.files && handleFileSelect(e.target.files)}
            />
          </div>

          {/* Pending preview */}
          {pendingFiles.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  {pendingFiles.length} pendiente{pendingFiles.length !== 1 ? 's' : ''}
                </p>
                <button
                  onClick={confirmarSubida}
                  disabled={subiendo}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                  style={{ background: 'var(--color-granito)', color: 'white' }}
                >
                  {subiendo ? <><Loader2 size={12} className="animate-spin" /> Subiendo…</> : <><Upload size={12} /> Subir</>}
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {pendingFiles.map((pf, i) => (
                  <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border" style={{ borderColor: 'var(--color-acero-claro)' }}>
                    <Image src={pf.previewUrl} alt="" fill className="object-cover" sizes="56px" />
                    <button onClick={() => removePending(i)} className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/50 hover:bg-red-500">
                      <X size={10} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Galería */}
          {fotosOrdenadas.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {fotosOrdenadas.map((foto, idx) => (
                <div key={foto.id} className="relative group rounded-lg overflow-hidden aspect-square border" style={{ borderColor: 'var(--color-acero-claro)' }}>
                  <Image src={getPublicUrl(foto.url)} alt="Foto" fill className="object-cover" sizes="160px" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                    {idx > 0 && (
                      <button onClick={() => reordenarFoto(foto, 'up')} className="p-1.5 rounded-full bg-white/20 hover:bg-white/40" title="Mover arriba">
                        <ChevronLeft size={14} className="text-white rotate-90" />
                      </button>
                    )}
                    <button onClick={() => toggleDestacada(foto)} className="p-1.5 rounded-full bg-white/20 hover:bg-amber-400" title={foto.destacada ? 'Quitar de home' : 'Mostrar en home'}>
                      <Star size={14} className="text-white" fill={foto.destacada ? 'white' : 'none'} />
                    </button>
                    <button onClick={() => setFotoAEliminar(foto)} className="p-1.5 rounded-full bg-white/20 hover:bg-red-500">
                      <X size={14} className="text-white" />
                    </button>
                    {idx < fotosOrdenadas.length - 1 && (
                      <button onClick={() => reordenarFoto(foto, 'down')} className="p-1.5 rounded-full bg-white/20 hover:bg-white/40" title="Mover abajo">
                        <ChevronLeft size={14} className="text-white -rotate-90" />
                      </button>
                    )}
                  </div>
                  <span className="absolute bottom-1 left-1 text-sm bg-black/50 text-white px-1.5 py-0.5 rounded font-mono">{idx + 1}</span>
                  {foto.destacada && <span className="absolute top-1 right-1"><Star size={12} className="text-amber-400" fill="currentColor" /></span>}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
              <ImageIcon size={16} strokeWidth={1.5} />
              Sin fotos aún. Subí la primera.
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-base" style={{ background: 'var(--color-granito)', color: 'white' }}>
          <CheckCircle size={15} />{toast}
        </div>
      )}

      {/* Confirm delete */}
      {fotoAEliminar && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFotoAEliminar(null)} />
          <div className="relative bg-white rounded-xl p-6 shadow-2xl max-w-sm mx-4 z-10">
            <p className="text-base font-medium mb-1" style={{ color: 'var(--foreground)' }}>¿Eliminar esta foto?</p>
            <p className="text-sm mb-5" style={{ color: 'var(--color-acero-oscuro)' }}>Esta acción no se puede deshacer.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setFotoAEliminar(null)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: 'var(--color-acero-oscuro)', background: 'var(--color-acero-brillo)' }}>Cancelar</button>
              <button onClick={confirmarEliminar} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#ef4444', color: 'white' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
