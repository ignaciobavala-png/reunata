'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Upload, X, ImageIcon, Loader2, ChevronRight, CheckCircle, Star } from 'lucide-react'
import Image from 'next/image'

interface Producto { id: number; codigo_interno: string; titulo: string; categoria: string | null }
interface Foto { id: number; producto_id: number; url: string; orden: number; destacada: boolean }
interface ArchivoPreview { file: File; previewUrl: string }

export function MultimediaClient({
  productos,
  fotosIniciales,
  supabaseUrl,
}: {
  productos: Producto[]
  fotosIniciales: Foto[]
  supabaseUrl: string
  supabaseKey: string
}) {
  const supabase = createClient()
  const [fotos, setFotos] = useState<Foto[]>(fotosIniciales)
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null)
  const [filtro, setFiltro] = useState<'todos' | 'sin_foto' | 'con_foto'>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [pendingFiles, setPendingFiles] = useState<ArchivoPreview[]>([])
  const [subiendo, setSubiendo] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fotosMap = fotos.reduce<Record<number, Foto[]>>((acc, f) => {
    acc[f.producto_id] = [...(acc[f.producto_id] ?? []), f].sort((a, b) => a.orden - b.orden)
    return acc
  }, {})

  const conFoto = productos.filter(p => (fotosMap[p.id]?.length ?? 0) > 0).length
  const productosSinFoto = productos.filter(p => !(fotosMap[p.id]?.length))

  const productosFiltrados = productos.filter(p => {
    if (busqueda.length > 1) {
      const q = busqueda.toLowerCase()
      if (!p.titulo.toLowerCase().includes(q) && !p.codigo_interno.toLowerCase().includes(q)) return false
    }
    const count = fotosMap[p.id]?.length ?? 0
    if (filtro === 'sin_foto') return count === 0
    if (filtro === 'con_foto') return count > 0
    return true
  })

  const productosPorCategoria = productosFiltrados.reduce<Record<string, Producto[]>>((acc, p) => {
    const cat = p.categoria ?? 'Sin categoría'
    acc[cat] = [...(acc[cat] ?? []), p]
    return acc
  }, {})

  const fotosDelProducto = productoSeleccionado ? (fotosMap[productoSeleccionado.id] ?? []) : []

  const getPublicUrl = (url: string) => `${supabaseUrl}/storage/v1/object/public/multimedia/${url}`

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  function seleccionarProducto(p: Producto) {
    pendingFiles.forEach(f => URL.revokeObjectURL(f.previewUrl))
    setPendingFiles([])
    setProductoSeleccionado(p)
  }

  function irAlSiguienteSinFoto() {
    const idxActual = productoSeleccionado
      ? productos.findIndex(p => p.id === productoSeleccionado.id)
      : -1
    const siguiente =
      productosSinFoto.find(p => productos.findIndex(x => x.id === p.id) > idxActual) ??
      productosSinFoto[0]
    if (siguiente) seleccionarProducto(siguiente)
  }

  function handleFileSelect(archivos: FileList | File[]) {
    const lista = Array.from(archivos).filter(f => f.type.startsWith('image/'))
    const nuevos: ArchivoPreview[] = lista.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    setPendingFiles(prev => [...prev, ...nuevos])
  }

  function removePending(idx: number) {
    setPendingFiles(prev => {
      URL.revokeObjectURL(prev[idx].previewUrl)
      return prev.filter((_, i) => i !== idx)
    })
  }

  useEffect(() => {
    return () => { pendingFiles.forEach(f => URL.revokeObjectURL(f.previewUrl)) }
  }, []) // eslint-disable-line

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
    if (!productoSeleccionado || subiendo || pendingFiles.length === 0) return
    setSubiendo(true)
    const nuevasFotos: Foto[] = []

    for (const { file } of pendingFiles) {
      let blob: Blob
      try { blob = await optimizarImagen(file) } catch { continue }

      const path = `productos/${productoSeleccionado.codigo_interno}/${Date.now()}.webp`
      const { error: uploadError } = await supabase.storage
        .from('multimedia')
        .upload(path, blob, { contentType: 'image/webp', upsert: false })
      if (uploadError) { console.error(uploadError); continue }

      const orden = fotosDelProducto.length + nuevasFotos.length
      const { data: fotoData } = await supabase
        .from('producto_fotos')
        .insert({ producto_id: productoSeleccionado.id, url: path, orden })
        .select()
        .single()
      if (fotoData) nuevasFotos.push(fotoData)
    }

    pendingFiles.forEach(f => URL.revokeObjectURL(f.previewUrl))
    setPendingFiles([])
    setFotos(prev => [...prev, ...nuevasFotos])
    setSubiendo(false)
    mostrarToast(`${nuevasFotos.length} foto${nuevasFotos.length !== 1 ? 's' : ''} subida${nuevasFotos.length !== 1 ? 's' : ''} correctamente`)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (productoSeleccionado && e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files)
  }, [productoSeleccionado]) // eslint-disable-line

  async function toggleDestacada(foto: Foto) {
    const nuevoValor = !foto.destacada
    await fetch('/api/multimedia', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: foto.id, destacada: nuevoValor }),
    })
    setFotos(prev => prev.map(f => f.id === foto.id ? { ...f, destacada: nuevoValor } : f))
  }

  async function eliminarFoto(foto: Foto) {
    await fetch('/api/multimedia', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: foto.url, fotoId: foto.id }),
    })
    setFotos(prev => prev.filter(f => f.id !== foto.id))
  }

  return (
    <div className="flex gap-6 max-w-6xl">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm"
          style={{ background: 'var(--color-granito)', color: 'white' }}>
          <CheckCircle size={15} />
          {toast}
        </div>
      )}

      {/* Panel izquierdo */}
      <div className="w-72 flex-shrink-0 flex flex-col">

        {/* Progreso */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
              <span className="font-semibold" style={{ color: 'var(--foreground)' }}>{conFoto}</span>
              {' '}/ {productos.length} con foto
            </p>
            {productosSinFoto.length > 0 && (
              <button
                onClick={irAlSiguienteSinFoto}
                className="text-xs flex items-center gap-0.5 hover:underline"
                style={{ color: 'var(--color-granito-claro)' }}
              >
                Siguiente sin foto <ChevronRight size={11} />
              </button>
            )}
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-acero-claro)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(conFoto / productos.length) * 100}%`, background: 'var(--color-granito)' }}
            />
          </div>
        </div>

        {/* Búsqueda */}
        <div className="relative mb-2">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-acero)' }} />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Nombre o código…"
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border outline-none"
            style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
          />
        </div>

        {/* Filtro tabs */}
        <div className="flex mb-3 rounded-lg overflow-hidden border text-xs" style={{ borderColor: 'var(--color-acero-claro)' }}>
          {(['todos', 'sin_foto', 'con_foto'] as const).map((f, i) => (
            <button key={f} onClick={() => setFiltro(f)}
              className="flex-1 py-1.5 transition-colors duration-100"
              style={{
                background: filtro === f ? 'var(--color-granito)' : 'white',
                color: filtro === f ? 'white' : 'var(--color-acero-oscuro)',
                borderRight: i < 2 ? '1px solid var(--color-acero-claro)' : 'none',
              }}>
              {f === 'todos' ? 'Todos' : f === 'sin_foto' ? 'Sin foto' : 'Con foto'}
            </button>
          ))}
        </div>

        {/* Lista de productos */}
        <div className="overflow-y-auto rounded-lg border" style={{ borderColor: 'var(--color-acero-claro)', height: 'calc(100vh - 26rem)' }}>
          {Object.entries(productosPorCategoria).map(([cat, prods]) => (
            <div key={cat}>
              <div
                className="px-3 py-1.5 text-xs font-medium sticky top-0 z-10 border-b"
                style={{ background: 'var(--color-acero-brillo)', color: 'var(--color-acero-oscuro)', borderColor: 'var(--color-acero-claro)' }}
              >
                {cat}
              </div>
              {prods.map(p => {
                const count = fotosMap[p.id]?.length ?? 0
                const primeraFoto = fotosMap[p.id]?.[0]
                const isSelected = productoSeleccionado?.id === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => seleccionarProducto(p)}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 transition-colors duration-100 border-b"
                    style={{
                      borderColor: 'var(--color-acero-claro)',
                      background: isSelected ? 'var(--color-acero-brillo)' : 'white',
                    }}
                  >
                    <div className="w-8 h-8 rounded flex-shrink-0 overflow-hidden"
                      style={{ background: 'var(--color-acero-claro)' }}>
                      {primeraFoto && (
                        <Image
                          src={getPublicUrl(primeraFoto.url)}
                          alt=""
                          width={32} height={32}
                          className="object-cover w-full h-full"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate" style={{ color: 'var(--foreground)' }}>{p.titulo}</p>
                      <p className="text-xs font-mono" style={{ color: 'var(--color-acero-oscuro)' }}>{p.codigo_interno}</p>
                    </div>
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        background: count > 0 ? '#dcfce7' : '#fee2e2',
                        color: count > 0 ? '#15803d' : '#b91c1c',
                      }}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
          {productosFiltrados.length === 0 && (
            <p className="text-xs p-4 text-center" style={{ color: 'var(--color-acero)' }}>Sin resultados</p>
          )}
        </div>
      </div>

      {/* Panel derecho */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!productoSeleccionado ? (
          <div className="flex-1 rounded-xl border-2 border-dashed flex items-center justify-center"
            style={{ borderColor: 'var(--color-acero-claro)' }}>
            <p className="text-xs" style={{ color: 'var(--color-acero)' }}>
              Seleccioná un producto del panel izquierdo
            </p>
          </div>
        ) : (
          <>
            {/* Header producto */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>{productoSeleccionado.titulo}</p>
                <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--color-acero-oscuro)' }}>{productoSeleccionado.codigo_interno}</p>
              </div>
              <button onClick={() => { seleccionarProducto(productoSeleccionado); setProductoSeleccionado(null) }}>
                <X size={14} style={{ color: 'var(--color-acero-oscuro)' }} />
              </button>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-5 mb-4 cursor-pointer transition-colors duration-150 flex-shrink-0"
              style={{ borderColor: 'var(--color-acero-claro)', background: 'white' }}
            >
              <Upload size={20} strokeWidth={1.5} style={{ color: 'var(--color-acero-oscuro)' }} />
              <p className="text-xs mt-2 mb-2" style={{ color: 'var(--color-acero-oscuro)' }}>
                Arrastrá fotos acá o usá el botón
              </p>
              <button
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: 'var(--color-granito)', color: 'white' }}
                onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
              >
                Seleccionar archivos
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
                className="hidden"
                onChange={e => e.target.files && handleFileSelect(e.target.files)}
              />
            </div>

            {/* Preview + confirmar */}
            {pendingFiles.length > 0 && (
              <div className="mb-4 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
                    {pendingFiles.length} foto{pendingFiles.length !== 1 ? 's' : ''} seleccionada{pendingFiles.length !== 1 ? 's' : ''}
                  </p>
                  <button
                    onClick={confirmarSubida}
                    disabled={subiendo}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                    style={{ background: 'var(--color-granito)', color: 'white' }}
                  >
                    {subiendo
                      ? <><Loader2 size={12} className="animate-spin" /> Subiendo…</>
                      : <><Upload size={12} /> Subir {pendingFiles.length} foto{pendingFiles.length !== 1 ? 's' : ''}</>
                    }
                  </button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {pendingFiles.map((pf, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border"
                      style={{ borderColor: 'var(--color-acero-claro)' }}>
                      <Image src={pf.previewUrl} alt="" fill className="object-cover" />
                      <button
                        onClick={() => removePending(i)}
                        className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/50 hover:bg-red-500 transition-colors"
                      >
                        <X size={10} className="text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Galería */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 32rem)' }}>
              {fotosDelProducto.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {fotosDelProducto.map(foto => (
                    <div key={foto.id} className="relative group rounded-lg overflow-hidden aspect-square border"
                      style={{ borderColor: 'var(--color-acero-claro)' }}>
                      <Image src={getPublicUrl(foto.url)} alt="Foto de producto" fill className="object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-2">
                        <button
                          onClick={() => toggleDestacada(foto)}
                          className="p-1.5 rounded-full bg-white/20 hover:bg-amber-400 transition-colors duration-150"
                          title={foto.destacada ? 'Quitar de la home' : 'Mostrar en home'}
                        >
                          <Star size={14} strokeWidth={2} className="text-white" fill={foto.destacada ? 'white' : 'none'} />
                        </button>
                        <button
                          onClick={() => eliminarFoto(foto)}
                          className="p-1.5 rounded-full bg-white/20 hover:bg-red-500 transition-colors duration-150"
                        >
                          <X size={14} strokeWidth={2} className="text-white" />
                        </button>
                      </div>
                      <span className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded font-mono">
                        #{foto.orden + 1}
                      </span>
                      {foto.destacada && (
                        <span className="absolute top-1 right-1">
                          <Star size={12} className="text-amber-400" fill="currentColor" />
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                  <ImageIcon size={16} strokeWidth={1.5} />
                  Este producto todavía no tiene fotos.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
