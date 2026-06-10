'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, Loader2, CheckCircle, ChevronLeft, Play, Pencil, ArrowLeft, Video, Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'
import { BannerClient } from './BannerClient'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import type { HeroFallbackConfig } from '@/components/sections/Hero'

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
  fallbackInicial,
}: {
  assetsIniciales: HeroAsset[]
  supabaseUrl: string
  supabaseKey: string
  isMaster: boolean
  initialSubtab?: 'carrusel' | 'banner'
  fallbackInicial?: HeroFallbackConfig
}) {
  const supabase = createClient()
  const [subtab, setSubtab] = useState<'carrusel' | 'banner'>(initialSubtab)
  const [assets, setAssets] = useState<HeroAsset[]>(assetsIniciales)
  const [pendingFiles, setPendingFiles] = useState<ArchivoPreview[]>([])
  const [subiendo, setSubiendo] = useState(false)
  const [compresiónProgreso, setCompresiónProgreso] = useState<{ nombre: string; pct: number } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const ffmpegRef = useRef<FFmpeg | null>(null)
  const [assetAEliminar, setAssetAEliminar] = useState<HeroAsset | null>(null)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [agregandoYt, setAgregandoYt] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<HeroAsset | null>(null)
  const [guardando, setGuardando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const [fallback, setFallback] = useState<HeroFallbackConfig>(fallbackInicial ?? {
    etiqueta: 'Nueva Colección',
    titulo: 'El mate que te une.',
    subtitulo: 'Productos importados, diseñados para quienes toman el mate en serio. Acero, granito y tradición en cada pieza.',
    boton_texto: 'Ver tienda',
    boton_url: '/tienda',
  })
  const [guardandoFallback, setGuardandoFallback] = useState(false)

  const activos = assets.filter(a => a.activo).length
  const sorted = [...assets].sort((a, b) => a.orden - b.orden)

  const [showYtInput, setShowYtInput] = useState(false)

  const getPublicUrl = (url: string) => `${supabaseUrl}/storage/v1/object/public/multimedia/${url}`

  function getVideoThumbnail(url: string): string | null {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
    if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`
    return null
  }

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  function handleFileSelect(archivos: FileList | File[]) {
    const rechazados: string[] = []
    const lista = Array.from(archivos).flatMap(file => {
      if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) {
        rechazados.push(file.name)
        return []
      }
      return [{ file, previewUrl: URL.createObjectURL(file), tipo: file.type.startsWith('video/') ? 'video' as const : 'imagen' as const }]
    })
    if (rechazados.length > 0) mostrarToast(`Formato no soportado: ${rechazados.join(', ')}`)
    if (lista.length > 0) setPendingFiles(prev => [...prev, ...lista])
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

  async function comprimirVideo(file: File): Promise<Blob> {
    if (!ffmpegRef.current) {
      const ff = new FFmpeg()
      // Carga el core single-thread desde CDN (no requiere headers COOP/COEP)
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
      await ff.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      })
      ffmpegRef.current = ff
    }

    const ff = ffmpegRef.current
    ff.on('progress', ({ progress }) => {
      setCompresiónProgreso(prev => prev ? { ...prev, pct: Math.round(progress * 100) } : null)
    })

    const inputName = 'input.mp4'
    const outputName = 'output.mp4'

    await ff.writeFile(inputName, await fetchFile(file))
    await ff.exec([
      '-i', inputName,
      '-vf', 'scale=-2:720',   // 720p, mantiene aspect ratio
      '-c:v', 'libx264',
      '-crf', '26',             // calidad/tamaño: 26 = buen balance
      '-preset', 'fast',
      '-an',                    // sin audio (videos hero son mudos)
      '-movflags', '+faststart', // metadata al inicio para streaming
      outputName,
    ])

    const data = await ff.readFile(outputName)
    await ff.deleteFile(inputName)
    await ff.deleteFile(outputName)

    // FileData = Uint8Array | string; extraemos un ArrayBuffer limpio para Blob
    const raw = typeof data === 'string' ? new TextEncoder().encode(data) : data
    const buf = (raw.buffer as ArrayBuffer).slice(raw.byteOffset, raw.byteOffset + raw.byteLength)
    return new Blob([buf], { type: 'video/mp4' })
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
        // Comprimir video antes de subir
        try {
          setCompresiónProgreso({ nombre: file.name, pct: 0 })
          blob = await comprimirVideo(file)
          setCompresiónProgreso(null)
        } catch (err) {
          console.error('Error comprimiendo video:', err)
          mostrarToast(`Error al comprimir "${file.name}". Subiendo original…`)
          setCompresiónProgreso(null)
          // Fallback: subir el original sin comprimir
        }
        ext = 'mp4'
      }

      const path = `hero/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('multimedia')
        .upload(path, blob, { contentType: tipo === 'imagen' ? 'image/webp' : file.type, upsert: false })
      if (uploadError) {
        console.error(uploadError)
        mostrarToast(`Error al subir "${file.name}": ${uploadError.message}`)
        if (nuevos.length > 0) setAssets(prev => [...prev, ...nuevos])
        setPendingFiles([])
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

  async function agregarYoutube() {
    const url = youtubeUrl.trim()
    if (!url) return
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
    if (!ytMatch && !vimeoMatch) {
      mostrarToast('URL no reconocida. Usá un link de YouTube o Vimeo.')
      return
    }
    setAgregandoYt(true)
    const maxOrden = assets.reduce((max, a) => Math.max(max, a.orden), 0)
    const { data } = await supabase
      .from('hero_assets')
      .insert({ tipo: 'video', url, orden: maxOrden + 1 })
      .select()
      .single()
    if (data) setAssets(prev => [...prev, data])
    setYoutubeUrl('')
    setShowYtInput(false)
    setAgregandoYt(false)
    mostrarToast('Video agregado al carrusel')
  }

  async function confirmarEliminar() {
    if (!assetAEliminar) return
    // Solo borrar de Storage si es un path local (no URL externa)
    const esExterno = assetAEliminar.url.startsWith('http')
    if (!esExterno) await supabase.storage.from('multimedia').remove([assetAEliminar.url])
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
    setGuardando(true)
    const payload = {
      etiqueta: asset.etiqueta,
      titulo: asset.titulo,
      subtitulo: asset.subtitulo,
      boton_texto: asset.boton_texto,
      boton_url: asset.boton_url,
    }
    const { error } = await supabase.from('hero_assets').update(payload).eq('id', asset.id)
    setGuardando(false)
    if (error) {
      mostrarToast('Error al guardar cambios')
      return
    }
    setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, ...payload } : a))
    setSelectedAsset(a => a?.id === asset.id ? { ...a, ...payload } : a)
    mostrarToast('Cambios guardados')
  }

  async function guardarFallback() {
    setGuardandoFallback(true)
    const entries: { clave: string; valor: string }[] = [
      { clave: 'hero_fallback_etiqueta', valor: fallback.etiqueta },
      { clave: 'hero_fallback_titulo', valor: fallback.titulo },
      { clave: 'hero_fallback_subtitulo', valor: fallback.subtitulo },
      { clave: 'hero_fallback_boton_texto', valor: fallback.boton_texto },
      { clave: 'hero_fallback_boton_url', valor: fallback.boton_url },
    ]
    const { error } = await supabase.from('configuracion').upsert(entries, { onConflict: 'clave' })
    setGuardandoFallback(false)
    mostrarToast(error ? 'Error al guardar el texto por defecto' : 'Texto por defecto guardado')
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
              {' '}de {assets.length} {assets.length === 1 ? 'slide' : 'slides'} en carrusel
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
              <div
                key={a.id}
                className="flex flex-col rounded-xl overflow-hidden border-2 transition-colors"
                style={{ borderColor: a.activo ? '#22c55e' : 'var(--color-acero-claro)' }}
              >
                {/* Thumbnail */}
                <div
                  onClick={() => abrirEditor(a)}
                  className="relative aspect-video cursor-pointer bg-black/10"
                >
                  {a.tipo === 'imagen' ? (
                    <Image src={getPublicUrl(a.url)} alt="" fill className="object-cover" />
                  ) : (() => {
                    const thumb = getVideoThumbnail(a.url)
                    return thumb ? (
                      <>
                        <Image src={thumb} alt="" fill className="object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="bg-black/60 rounded-full p-2">
                            <Play size={22} className="text-white" fill="white" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-black/80">
                        <Play size={28} className="text-white/60" />
                        <span className="text-xs text-white/40">Vimeo</span>
                      </div>
                    )
                  })()}
                  <span className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded font-mono">{idx + 1}</span>
                  {a.tipo === 'video' && (
                    <span className="absolute top-2 right-2 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded">
                      {a.url.startsWith('http') ? 'YT/Vimeo' : 'video'}
                    </span>
                  )}
                  {!a.titulo && (
                    <span className="absolute bottom-2 right-2 text-xs bg-amber-500/90 text-white px-1.5 py-0.5 rounded">Sin título</span>
                  )}
                </div>

                {/* Barra de controles — siempre visible */}
                <div
                  className="flex items-center gap-1 px-1.5 py-1.5"
                  style={{ background: 'white', borderTop: '1px solid var(--color-acero-claro)' }}
                >
                  {/* Reordenar */}
                  <button
                    onClick={() => reordenar(a, 'up')}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-20 disabled:cursor-default"
                    title="Mover antes"
                  >
                    <ChevronLeft size={13} className="rotate-90" style={{ color: 'var(--color-acero-oscuro)' }} />
                  </button>
                  <button
                    onClick={() => reordenar(a, 'down')}
                    disabled={idx === sorted.length - 1}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-20 disabled:cursor-default"
                    title="Mover después"
                  >
                    <ChevronLeft size={13} className="-rotate-90" style={{ color: 'var(--color-acero-oscuro)' }} />
                  </button>

                  {/* Toggle visibilidad */}
                  <button
                    onClick={() => toggleActivo(a)}
                    className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-xs font-medium transition-colors mx-0.5"
                    style={{
                      background: a.activo ? '#dcfce7' : 'var(--color-acero-brillo)',
                      color: a.activo ? '#16a34a' : 'var(--color-acero-oscuro)',
                    }}
                  >
                    {a.activo
                      ? <><Eye size={11} /> En carrusel</>
                      : <><EyeOff size={11} /> Oculto</>
                    }
                  </button>

                  {/* Editar textos */}
                  <button
                    onClick={() => abrirEditor(a)}
                    className="p-1 rounded hover:bg-gray-100"
                    title="Editar título y texto"
                  >
                    <Pencil size={13} style={{ color: 'var(--color-acero-oscuro)' }} />
                  </button>

                  {/* Eliminar */}
                  <button
                    onClick={() => pedirEliminar(a)}
                    className="p-1 rounded hover:bg-red-50"
                    title="Eliminar"
                  >
                    <X size={13} style={{ color: '#ef4444' }} />
                  </button>
                </div>
              </div>
            )
          })}

          {/* Card — Subir archivo */}
          <button
            onClick={() => inputRef.current?.click()}
            className="aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors hover:border-[var(--color-granito)]"
            style={{ borderColor: 'var(--color-acero-claro)' }}
          >
            <Upload size={20} style={{ color: 'var(--color-acero-oscuro)' }} />
            <span className="text-sm text-center px-2" style={{ color: 'var(--color-acero-oscuro)' }}>Subir imagen</span>
          </button>

          {/* Card — Agregar YT/Vimeo */}
          <div
            className="aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors"
            style={{ borderColor: showYtInput ? 'var(--color-granito)' : 'var(--color-acero-claro)' }}
          >
            {showYtInput ? (
              <div className="w-full px-3 flex flex-col gap-2">
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={e => setYoutubeUrl(e.target.value)}
                  placeholder="youtube.com/watch?v=..."
                  autoFocus
                  className="w-full px-2 py-1.5 text-xs rounded border outline-none"
                  style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') agregarYoutube()
                    if (e.key === 'Escape') { setShowYtInput(false); setYoutubeUrl('') }
                  }}
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={agregarYoutube}
                    disabled={agregandoYt || !youtubeUrl.trim()}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium disabled:opacity-50"
                    style={{ background: 'var(--color-granito)', color: 'white' }}
                  >
                    {agregandoYt ? <Loader2 size={11} className="animate-spin" /> : 'Agregar'}
                  </button>
                  <button
                    onClick={() => { setShowYtInput(false); setYoutubeUrl('') }}
                    className="px-2 py-1.5 rounded text-xs"
                    style={{ color: 'var(--color-acero-oscuro)', background: 'var(--color-acero-brillo)' }}
                  >
                    <X size={11} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowYtInput(true)}
                className="flex flex-col items-center gap-2 w-full h-full justify-center"
              >
                <Video size={20} style={{ color: '#ff0000' }} />
                <span className="text-sm text-center px-2" style={{ color: 'var(--color-acero-oscuro)' }}>YouTube / Vimeo</span>
              </button>
            )}
          </div>
        </div>

        {/* Barra de compresión de video */}
        {compresiónProgreso && (
          <div className="rounded-xl border p-4 mb-4" style={{ borderColor: 'var(--color-acero-claro)', background: 'white' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Comprimiendo video…
              </p>
              <span className="text-sm tabular-nums" style={{ color: 'var(--color-acero-oscuro)' }}>
                {compresiónProgreso.pct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-acero-claro)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${compresiónProgreso.pct}%`, background: 'var(--color-granito)' }}
              />
            </div>
            <p className="text-xs mt-1.5 truncate" style={{ color: 'var(--color-acero-oscuro)' }}>
              {compresiónProgreso.nombre}
            </p>
          </div>
        )}

        <div
          onDragOver={e => e.preventDefault()}
          onDrop={onDrop}
          className="rounded-xl border-2 border-dashed p-4 mb-4"
          style={{ borderColor: 'var(--color-acero-claro)' }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
              {pendingFiles.length > 0
                ? `${pendingFiles.length} archivo${pendingFiles.length !== 1 ? 's' : ''} pendiente${pendingFiles.length !== 1 ? 's' : ''}`
                : <>Arrastrá archivos acá o usá el botón + <span className="opacity-60">(imágenes o video — se convierte a MP4)</span></>}
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
                  {compresiónProgreso ? <><Loader2 size={12} className="animate-spin" /> Comprimiendo…</> : subiendo ? <><Loader2 size={12} className="animate-spin" /> Subiendo…</> : <><Upload size={12} /> Subir</>}
                </button>
              </div>
            )}
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,video/*"
          multiple
          className="hidden"
          onChange={e => e.target.files && handleFileSelect(e.target.files)}
        />

        {/* Texto por defecto */}
        <div className="rounded-xl border p-5 mb-4" style={{ borderColor: 'var(--color-acero-claro)', background: 'white' }}>
          <h3 className="text-base font-medium mb-1" style={{ color: 'var(--foreground)' }}>Texto por defecto</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--color-acero-oscuro)' }}>
            Aparece en el sitio cuando el carrusel está vacío, o en un slide que no tiene texto configurado.
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>Etiqueta</label>
              <input
                type="text"
                value={fallback.etiqueta}
                onChange={e => setFallback(f => ({ ...f, etiqueta: e.target.value }))}
                placeholder="Ej: Nueva Colección"
                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1"
                style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>Título principal</label>
              <input
                type="text"
                value={fallback.titulo}
                onChange={e => setFallback(f => ({ ...f, titulo: e.target.value }))}
                placeholder="Ej: El mate que te une."
                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1"
                style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>Subtítulo</label>
              <textarea
                value={fallback.subtitulo}
                onChange={e => setFallback(f => ({ ...f, subtitulo: e.target.value }))}
                rows={2}
                placeholder="Descripción breve..."
                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 resize-none"
                style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>Texto del botón</label>
                <input
                  type="text"
                  value={fallback.boton_texto}
                  onChange={e => setFallback(f => ({ ...f, boton_texto: e.target.value }))}
                  placeholder="Ver tienda"
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1"
                  style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>URL del botón</label>
                <input
                  type="text"
                  value={fallback.boton_url}
                  onChange={e => setFallback(f => ({ ...f, boton_url: e.target.value }))}
                  placeholder="/tienda"
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 font-mono"
                  style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                onClick={guardarFallback}
                disabled={guardandoFallback}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
                style={{ background: 'var(--color-granito)', color: 'white' }}
              >
                {guardandoFallback ? <><Loader2 size={13} className="animate-spin" /> Guardando…</> : 'Guardar texto por defecto'}
              </button>
            </div>
          </div>
        </div>
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
                ) : (() => {
                  const thumb = getVideoThumbnail(selectedAsset.url)
                  return thumb ? (
                    <>
                      <Image src={thumb} alt="" fill className="object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="bg-black/60 rounded-full p-3">
                          <Play size={28} className="text-white" fill="white" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-black/80">
                      <Play size={32} className="text-white/60" />
                      <span className="text-xs text-white/40">Vimeo</span>
                    </div>
                  )
                })()}
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
                disabled={guardando}
                className="w-full px-4 py-3 rounded-lg text-base font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: 'var(--color-granito)', color: 'white' }}
              >
                {guardando ? <><Loader2 size={14} className="animate-spin" /> Guardando…</> : 'Guardar cambios'}
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
