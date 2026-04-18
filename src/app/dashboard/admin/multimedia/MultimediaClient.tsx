'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Upload, X, ImageIcon, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface Producto { id: number; codigo_interno: string; titulo: string; categoria: string | null }
interface Foto { id: number; producto_id: number; url: string; orden: number }

export function MultimediaClient({
  productos,
  fotosIniciales,
  supabaseUrl,
  supabaseKey,
}: {
  productos: Producto[]
  fotosIniciales: Foto[]
  supabaseUrl: string
  supabaseKey: string
}) {
  const supabase = createClient()
  const [busqueda, setBusqueda] = useState('')
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null)
  const [fotos, setFotos] = useState<Foto[]>(fotosIniciales)
  const [subiendo, setSubiendo] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const productosFiltrados = busqueda.length > 1
    ? productos.filter(p =>
        p.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.codigo_interno.toLowerCase().includes(busqueda.toLowerCase())
      ).slice(0, 8)
    : []

  const fotosDelProducto = productoSeleccionado
    ? fotos.filter(f => f.producto_id === productoSeleccionado.id).sort((a, b) => a.orden - b.orden)
    : []

  const getPublicUrl = (url: string) =>
    `${supabaseUrl}/storage/v1/object/public/multimedia/${url}`

  async function subirArchivos(archivos: FileList | File[]) {
    if (!productoSeleccionado || subiendo) return
    setSubiendo(true)

    const lista = Array.from(archivos)
    const nuevasFotos: Foto[] = []

    for (const archivo of lista) {
      const ext = archivo.name.split('.').pop()
      const path = `productos/${productoSeleccionado.codigo_interno}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('multimedia')
        .upload(path, archivo, { upsert: false })

      if (uploadError) { console.error(uploadError); continue }

      const orden = fotosDelProducto.length + nuevasFotos.length
      const { data: fotoData } = await supabase
        .from('producto_fotos')
        .insert({ producto_id: productoSeleccionado.id, url: path, orden })
        .select()
        .single()

      if (fotoData) nuevasFotos.push(fotoData)
    }

    setFotos(prev => [...prev, ...nuevasFotos])
    setSubiendo(false)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length > 0) subirArchivos(e.dataTransfer.files)
  }, [productoSeleccionado, fotosDelProducto]) // eslint-disable-line

  async function eliminarFoto(foto: Foto) {
    await fetch('/api/multimedia', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: foto.url, fotoId: foto.id }),
    })
    setFotos(prev => prev.filter(f => f.id !== foto.id))
  }

  return (
    <div className="flex gap-8 max-w-5xl">

      {/* Panel izquierdo — buscador de productos */}
      <div className="w-72 flex-shrink-0">
        <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--color-granito-claro)' }}>
          1. Seleccioná el producto
        </p>

        <div className="relative mb-2">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-acero)' }} />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o código…"
            className="w-full pl-8 pr-3 py-2.5 text-xs rounded-lg border outline-none"
            style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
          />
        </div>

        {/* Resultados búsqueda */}
        {productosFiltrados.length > 0 && (
          <div className="rounded-lg border overflow-hidden mb-3" style={{ borderColor: 'var(--color-acero-claro)' }}>
            {productosFiltrados.map((p, i) => (
              <button
                key={p.id}
                onClick={() => { setProductoSeleccionado(p); setBusqueda('') }}
                className="w-full text-left px-3 py-2.5 text-xs transition-colors duration-100"
                style={{
                  background: 'white',
                  borderBottom: i < productosFiltrados.length - 1 ? '1px solid var(--color-acero-claro)' : 'none',
                  color: 'var(--foreground)',
                }}
              >
                <span className="font-mono" style={{ color: 'var(--color-acero-oscuro)' }}>{p.codigo_interno}</span>
                <span className="ml-2">{p.titulo}</span>
              </button>
            ))}
          </div>
        )}

        {/* Producto seleccionado */}
        {productoSeleccionado && (
          <div
            className="rounded-lg p-3 border"
            style={{ background: 'var(--color-acero-brillo)', borderColor: 'var(--color-acero-claro)' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{productoSeleccionado.titulo}</p>
                <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--color-acero-oscuro)' }}>{productoSeleccionado.codigo_interno}</p>
                {productoSeleccionado.categoria && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-acero-oscuro)' }}>{productoSeleccionado.categoria}</p>
                )}
              </div>
              <button onClick={() => setProductoSeleccionado(null)}>
                <X size={13} style={{ color: 'var(--color-acero-oscuro)' }} />
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--color-granito-claro)' }}>
              {fotosDelProducto.length} {fotosDelProducto.length === 1 ? 'foto' : 'fotos'}
            </p>
          </div>
        )}
      </div>

      {/* Panel derecho — uploader + galería */}
      <div className="flex-1">
        <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--color-granito-claro)' }}>
          2. Subí las fotos
        </p>

        {!productoSeleccionado ? (
          <div
            className="rounded-xl border-2 border-dashed flex items-center justify-center h-48"
            style={{ borderColor: 'var(--color-acero-claro)' }}
          >
            <p className="text-xs" style={{ color: 'var(--color-acero)' }}>
              Seleccioná un producto primero
            </p>
          </div>
        ) : (
          <>
            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center h-40 cursor-pointer transition-colors duration-150 mb-6"
              style={{
                borderColor: dragging ? 'var(--color-granito)' : 'var(--color-acero-claro)',
                background: dragging ? 'var(--color-acero-brillo)' : 'white',
              }}
            >
              {subiendo
                ? <Loader2 size={22} strokeWidth={1.5} className="animate-spin" style={{ color: 'var(--color-acero-oscuro)' }} />
                : <Upload size={22} strokeWidth={1.5} style={{ color: 'var(--color-acero-oscuro)' }} />
              }
              <p className="text-xs mt-2" style={{ color: 'var(--color-acero-oscuro)' }}>
                {subiendo ? 'Subiendo…' : 'Arrastrá imágenes o hacé click para seleccionar'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-acero)' }}>
                JPG, PNG, WEBP — máx. 10MB por archivo
              </p>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
                className="hidden"
                onChange={e => e.target.files && subirArchivos(e.target.files)}
              />
            </div>

            {/* Galería */}
            {fotosDelProducto.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {fotosDelProducto.map((foto) => (
                  <div key={foto.id} className="relative group rounded-lg overflow-hidden aspect-square border" style={{ borderColor: 'var(--color-acero-claro)' }}>
                    <Image
                      src={getPublicUrl(foto.url)}
                      alt="Foto de producto"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center">
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
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                <ImageIcon size={16} strokeWidth={1.5} />
                Este producto todavía no tiene fotos.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
