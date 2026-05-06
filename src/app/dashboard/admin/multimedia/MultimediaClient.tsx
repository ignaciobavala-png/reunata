'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Upload, X, ImageIcon, Loader2, CheckCircle, Star, ChevronLeft } from 'lucide-react'
import Image from 'next/image'

interface Producto { id: number; codigo_interno: string; titulo: string; categoria: string | null }
interface Foto { id: number; producto_id: number; url: string; orden: number; destacada: boolean }
interface ArchivoPreview { file: File; previewUrl: string }

export function MultimediaClient({
  productos,
  fotosIniciales,
  supabaseUrl,
  supabaseKey,
  isMaster,
}: {
  productos: Producto[]
  fotosIniciales: Foto[]
  supabaseUrl: string
  supabaseKey: string
  isMaster: boolean
}) {
  const supabase = createClient()
  const [fotos, setFotos] = useState<Foto[]>(fotosIniciales)
  const [categoriaActiva, setCategoriaActiva] = useState<string>('Todas')
  const [filtro, setFiltro] = useState<'todos' | 'sin_foto' | 'con_foto'>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null)
  const [pendingFiles, setPendingFiles] = useState<ArchivoPreview[]>([])
  const [subiendo, setSubiendo] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [fotoAEliminar, setFotoAEliminar] = useState<Foto | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fotosMap = fotos.reduce<Record<number, Foto[]>>((acc, f) => {
    acc[f.producto_id] = [...(acc[f.producto_id] ?? []), f].sort((a, b) => a.orden - b.orden)
    return acc
  }, {})

  const categorias = ['Todas', ...Array.from(new Set(productos.map(p => p.categoria ?? 'Sin categoría'))).sort()]

  const conFoto = productos.filter(p => (fotosMap[p.id]?.length ?? 0) > 0).length

  const productosFiltrados = productos.filter(p => {
    const cat = p.categoria ?? 'Sin categoría'
    if (categoriaActiva !== 'Todas' && cat !== categoriaActiva) return false
    if (busqueda.length > 1) {
      const q = busqueda.toLowerCase()
      if (!p.titulo.toLowerCase().includes(q) && !p.codigo_interno.toLowerCase().includes(q)) return false
    }
    const count = fotosMap[p.id]?.length ?? 0
    if (filtro === 'sin_foto') return count === 0
    if (filtro === 'con_foto') return count > 0
    return true
  })

  const fotosDelProducto = productoSeleccionado ? (fotosMap[productoSeleccionado.id] ?? []) : []

  const getPublicUrl = (url: string) => `${supabaseUrl}/storage/v1/object/public/multimedia/${url}`

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
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
    if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files)
  }, []) // eslint-disable-line

  async function toggleDestacada(foto: Foto) {
    const nuevoValor = !foto.destacada
    await fetch('/api/multimedia', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Is-Master': isMaster ? 'true' : 'false' },
      body: JSON.stringify({ id: foto.id, destacada: nuevoValor }),
    })
    setFotos(prev => prev.map(f => f.id === foto.id ? { ...f, destacada: nuevoValor } : f))
  }

  async function eliminarFoto(foto: Foto) {
    setFotoAEliminar(foto)
  }

  async function confirmarEliminar() {
    if (!fotoAEliminar) return
    await fetch('/api/multimedia', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'X-Is-Master': isMaster ? 'true' : 'false' },
      body: JSON.stringify({ path: fotoAEliminar.url, fotoId: fotoAEliminar.id }),
    })
    setFotos(prev => prev.filter(f => f.id !== fotoAEliminar.id))
    setFotoAEliminar(null)
    mostrarToast('Foto eliminada')
  }

  async function reordenarFoto(foto: Foto, direccion: 'up' | 'down') {
    const idxActual = fotosDelProducto.findIndex(f => f.id === foto.id)
    const otra = direccion === 'up' ? fotosDelProducto[idxActual - 1] : fotosDelProducto[idxActual + 1]
    if (!otra) return

    await fetch('/api/multimedia', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Is-Master': isMaster ? 'true' : 'false' },
      body: JSON.stringify({ id: foto.id, orden: otra.orden }),
    })
    const temp = otra.orden
    setFotos(prev => prev.map(f => {
      if (f.id === foto.id) return { ...f, orden: temp }
      if (f.id === otra.id) return { ...f, orden: foto.orden }
      return f
    }))
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-base"
          style={{ background: 'var(--color-granito)', color: 'white' }}>
          <CheckCircle size={15} />
          {toast}
        </div>
      )}

      {/* Barra superior */}
      <div className="flex-shrink-0 mb-6">
        {/* Progreso */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
              <span className="font-semibold" style={{ color: 'var(--foreground)' }}>{conFoto}</span>
              {' '}/ {productos.length} con foto
            </p>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-acero-claro)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(conFoto / productos.length) * 100}%`, background: 'var(--color-granito)' }}
            />
          </div>
        </div>

        {/* Search + filtros */}
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative w-64">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-acero)' }} />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Nombre o código…"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border outline-none"
              style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
            />
          </div>

          <div className="flex rounded-lg overflow-hidden border text-sm" style={{ borderColor: 'var(--color-acero-claro)' }}>
            {(['todos', 'sin_foto', 'con_foto'] as const).map((f, i) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className="px-3 py-2 transition-colors duration-100"
                style={{
                  background: filtro === f ? 'var(--color-granito)' : 'white',
                  color: filtro === f ? 'white' : 'var(--color-acero-oscuro)',
                  borderRight: i < 2 ? '1px solid var(--color-acero-claro)' : 'none',
                }}
              >
                {f === 'todos' ? 'Todos' : f === 'sin_foto' ? 'Sin foto' : 'Con foto'}
              </button>
            ))}
          </div>

          <span className="text-sm ml-auto" style={{ color: 'var(--color-acero-oscuro)' }}>
            {productosFiltrados.length} productos
          </span>
        </div>

        {/* Tabs categorías */}
        <div className="flex gap-1 mt-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {categorias.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoriaActiva(cat)}
              className="px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors duration-100 flex-shrink-0"
              style={{
                background: categoriaActiva === cat ? 'var(--color-granito)' : 'var(--color-acero-brillo)',
                color: categoriaActiva === cat ? 'white' : 'var(--color-acero-oscuro)',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de productos */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {productosFiltrados.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm" style={{ color: 'var(--color-acero)' }}>
            Sin resultados
          </div>
        ) : (
          <div className="overflow-x-auto pb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: 'var(--color-acero-claro)' }}>
                  <th className="pb-2 font-medium text-xs tracking-widest uppercase" style={{ color: 'var(--color-acero-oscuro)' }}>Producto</th>
                  <th className="pb-2 font-medium text-xs tracking-widest uppercase" style={{ color: 'var(--color-acero-oscuro)' }}>Categoría</th>
                  <th className="pb-2 font-medium text-xs tracking-widest uppercase" style={{ color: 'var(--color-acero-oscuro)' }}>Fotos</th>
                  <th className="pb-2 font-medium text-xs tracking-widest uppercase text-right" style={{ color: 'var(--color-acero-oscuro)' }}>Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-acero-claro)' }}>
                {productosFiltrados.map(p => {
                  const count = fotosMap[p.id]?.length ?? 0
                  const isSelected = productoSeleccionado?.id === p.id
                  return (
                    <tr
                      key={p.id}
                      className="transition-colors duration-100 cursor-pointer"
                      style={{
                        background: isSelected ? 'var(--color-acero-brillo)' : 'transparent',
                      }}
                    >
                      <td className="py-2.5 pr-4">
                        <button
                          onClick={() => {
                            pendingFiles.forEach(f => URL.revokeObjectURL(f.previewUrl))
                            setPendingFiles([])
                            setProductoSeleccionado(p)
                          }}
                          className="text-left"
                        >
                          <p className="font-medium truncate max-w-[220px]" style={{ color: 'var(--foreground)' }}>
                            {p.titulo}
                          </p>
                          <p className="text-xs font-mono" style={{ color: 'var(--color-acero-oscuro)' }}>
                            {p.codigo_interno}
                          </p>
                        </button>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span style={{ color: 'var(--color-acero)' }}>{p.categoria ?? '—'}</span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1">
                            {fotosMap[p.id]?.slice(0, 3).map(foto => (
                              <div
                                key={foto.id}
                                className="w-7 h-7 rounded border border-white overflow-hidden relative"
                                style={{ background: 'var(--color-acero-brillo)' }}
                              >
                                <Image
                                  src={getPublicUrl(foto.url)}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="28px"
                                />
                              </div>
                            ))}
                            {count === 0 && (
                              <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>—</span>
                            )}
                          </div>
                          <span
                            className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                            style={{
                              background: count > 0 ? '#dcfce7' : '#fee2e2',
                              color: count > 0 ? '#15803d' : '#b91c1c',
                            }}
                          >
                            {count}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => {
                              pendingFiles.forEach(f => URL.revokeObjectURL(f.previewUrl))
                              setPendingFiles([])
                              setProductoSeleccionado(p)
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors duration-100"
                            style={{
                              background: count > 0 ? 'var(--color-acero-brillo)' : 'var(--color-granito)',
                              color: count > 0 ? 'var(--color-acero-oscuro)' : 'white',
                            }}
                          >
                            {count > 0 ? 'Ver' : 'Subir'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Panel lateral */}
      {productoSeleccionado && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setProductoSeleccionado(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-96 bg-white z-50 shadow-2xl flex flex-col"
            style={{ maxWidth: '100vw' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0" style={{ borderColor: 'var(--color-acero-claro)' }}>
              <div className="min-w-0">
                <p className="font-medium text-base truncate" style={{ color: 'var(--foreground)' }}>{productoSeleccionado.titulo}</p>
                <p className="text-sm font-mono" style={{ color: 'var(--color-acero-oscuro)' }}>{productoSeleccionado.codigo_interno}</p>
              </div>
              <button
                onClick={() => setProductoSeleccionado(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={16} style={{ color: 'var(--color-acero-oscuro)' }} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* Drop zone */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-4 mb-4 cursor-pointer transition-colors duration-150"
                style={{ borderColor: 'var(--color-acero-claro)' }}
              >
                <Upload size={18} strokeWidth={1.5} style={{ color: 'var(--color-acero-oscuro)' }} />
                <p className="text-sm mt-1.5 mb-2" style={{ color: 'var(--color-acero-oscuro)' }}>
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

              {/* Preview + confirmar */}
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
                      <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border"
                        style={{ borderColor: 'var(--color-acero-claro)' }}>
                        <Image src={pf.previewUrl} alt="" fill className="object-cover" />
                        <button
                          onClick={() => removePending(i)}
                          className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/50 hover:bg-red-500"
                        >
                          <X size={10} className="text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Galería */}
              {fotosDelProducto.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {fotosDelProducto.map(foto => {
                    const idxActual = fotosDelProducto.findIndex(f => f.id === foto.id)
                    return (
                      <div key={foto.id} className="relative group rounded-lg overflow-hidden aspect-square border"
                        style={{ borderColor: 'var(--color-acero-claro)' }}>
                        <Image src={getPublicUrl(foto.url)} alt="Foto" fill className="object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                          {idxActual > 0 && (
                            <button
                              onClick={() => reordenarFoto(foto, 'up')}
                              className="p-1.5 rounded-full bg-white/20 hover:bg-white/40"
                              title="Mover arriba"
                            >
                              <ChevronLeft size={14} className="text-white rotate-90" />
                            </button>
                          )}
                          <button
                            onClick={() => toggleDestacada(foto)}
                            className="p-1.5 rounded-full bg-white/20 hover:bg-amber-400"
                            title={foto.destacada ? 'Quitar de home' : 'Mostrar en home'}
                          >
                            <Star size={14} className="text-white" fill={foto.destacada ? 'white' : 'none'} />
                          </button>
                          <button
                            onClick={() => eliminarFoto(foto)}
                            className="p-1.5 rounded-full bg-white/20 hover:bg-red-500"
                          >
                            <X size={14} className="text-white" />
                          </button>
                          {idxActual < fotosDelProducto.length - 1 && (
                            <button
                              onClick={() => reordenarFoto(foto, 'down')}
                              className="p-1.5 rounded-full bg-white/20 hover:bg-white/40"
                              title="Mover abajo"
                            >
                              <ChevronLeft size={14} className="text-white -rotate-90" />
                            </button>
                          )}
                        </div>
                        <span className="absolute bottom-1 left-1 text-sm bg-black/50 text-white px-1.5 py-0.5 rounded font-mono">
                          {idxActual + 1}
                        </span>
                        {foto.destacada && (
                          <span className="absolute top-1 right-1">
                            <Star size={12} className="text-amber-400" fill="currentColor" />
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
                  <ImageIcon size={16} strokeWidth={1.5} />
                  Sin fotos aún. Subí la primera.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Confirmación de eliminación */}
      {fotoAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFotoAEliminar(null)} />
          <div className="relative bg-white rounded-xl p-6 shadow-2xl max-w-sm mx-4 z-10">
            <p className="text-base font-medium mb-1" style={{ color: 'var(--foreground)' }}>
              ¿Eliminar esta foto?
            </p>
            <p className="text-sm mb-5" style={{ color: 'var(--color-acero-oscuro)' }}>
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setFotoAEliminar(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ color: 'var(--color-acero-oscuro)', background: 'var(--color-acero-brillo)' }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminar}
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
