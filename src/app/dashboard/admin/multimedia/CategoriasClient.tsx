'use client'

import { useState, useRef } from 'react'
import { Plus, Check, X, ToggleLeft, ToggleRight, ImagePlus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { supabaseImg } from '@/lib/images'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

interface CategoriaHome {
  id: number
  nombre: string
  descripcion: string | null
  href: string | null
  activo: boolean
  categoria_keys: string[]
  foto_url: string | null
  orden: number
}

function GesuSelector({
  selected,
  available,
  onChange,
}: {
  selected: string[]
  available: string[]
  onChange: (keys: string[]) => void
}) {
  function toggle(cat: string) {
    onChange(selected.includes(cat) ? selected.filter(k => k !== cat) : [...selected, cat])
  }

  // Categorías seleccionadas que ya no tienen productos activos (huérfanas)
  const huerfanas = selected.filter(k => !available.includes(k))
  const todas = [...available, ...huerfanas.filter(k => !available.includes(k))]

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>
        Categorías Gesu incluidas ({selected.length} seleccionadas)
      </p>
      <div className="flex flex-wrap gap-1.5 p-3 rounded-lg border max-h-40 overflow-y-auto"
        style={{ borderColor: 'var(--color-acero-claro)', background: 'var(--color-acero-brillo)' }}>
        {todas.map(cat => {
          const activo = selected.includes(cat)
          const huerfana = !available.includes(cat)
          return (
            <button
              key={cat}
              type="button"
              onClick={() => toggle(cat)}
              className="text-xs px-2.5 py-1 rounded-full transition-all"
              style={activo
                ? { background: huerfana ? '#dc2626' : 'var(--color-granito)', color: 'white' }
                : { background: 'white', color: 'var(--color-granito-claro)', border: '1px solid var(--color-acero-claro)' }
              }
              title={huerfana ? 'Sin productos activos — click para quitar' : undefined}
            >
              {activo && <Check size={10} className="inline mr-1" />}
              {cat}
            </button>
          )
        })}
        {todas.length === 0 && (
          <p className="text-xs italic" style={{ color: 'var(--color-acero-oscuro)' }}>
            Sincronizá productos desde Gesu para ver las categorías disponibles.
          </p>
        )}
      </div>
      {huerfanas.length > 0 && (
        <p className="text-xs" style={{ color: '#dc2626' }}>
          {huerfanas.length} categoría{huerfanas.length > 1 ? 's' : ''} en rojo no tienen productos activos. Clickeá para quitarlas.
        </p>
      )}
    </div>
  )
}

export function CategoriasClient({
  categoriasIniciales,
  isMaster,
  gesuCategorias,
}: {
  categoriasIniciales: CategoriaHome[]
  isMaster: boolean
  gesuCategorias: string[]
}) {
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const [categorias, setCategorias] = useState<CategoriaHome[]>(categoriasIniciales)
  const [editando, setEditando] = useState<number | null>(null)
  const [form, setForm] = useState<Partial<CategoriaHome>>({})
  const [creando, setCreando] = useState(false)
  const [nuevoForm, setNuevoForm] = useState({ nombre: '', descripcion: '', href: '', categoria_keys: [] as string[] })
  const [saving, setSaving] = useState(false)
  const [uploadingId, setUploadingId] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const editFileRef = useRef<HTMLInputElement | null>(null)

  async function toggleActivo(cat: CategoriaHome) {
    await fetch('/api/categorias-home', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Is-Master': isMaster ? 'true' : 'false' },
      body: JSON.stringify({ id: cat.id, activo: !cat.activo }),
    })
    setCategorias(prev => prev.map(c => c.id === cat.id ? { ...c, activo: !c.activo } : c))
  }

  async function moverCategoria(id: number, dir: -1 | 1) {
    const index = categorias.findIndex(c => c.id === id)
    const target = index + dir
    if (target < 0 || target >= categorias.length) return

    const reordenado = [...categorias]
    ;[reordenado[index], reordenado[target]] = [reordenado[target], reordenado[index]]
    // Renumerar orden = posición en la lista (normaliza los 999 iniciales)
    const conOrden = reordenado.map((c, i) => ({ ...c, orden: i }))
    const previos = new Map(categorias.map(c => [c.id, c.orden]))
    setCategorias(conOrden)

    // Persistir solo las filas cuyo orden cambió
    await Promise.all(
      conOrden
        .filter(c => previos.get(c.id) !== c.orden)
        .map(c => fetch('/api/categorias-home', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'X-Is-Master': isMaster ? 'true' : 'false' },
          body: JSON.stringify({ id: c.id, orden: c.orden }),
        }))
    )
  }

  async function guardarEdicion(id: number) {
    setSaving(true)
    const keys = Array.isArray(form.categoria_keys) ? form.categoria_keys : []
    await fetch('/api/categorias-home', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Is-Master': isMaster ? 'true' : 'false' },
      body: JSON.stringify({ id, nombre: form.nombre, descripcion: form.descripcion, href: form.href, categoria_keys: keys }),
    })
    setCategorias(prev => prev.map(c => c.id === id ? { ...c, ...form, categoria_keys: keys } : c))
    setEditando(null)
    setSaving(false)
  }

  async function crearCategoria() {
    setSaving(true)
    const res = await fetch('/api/categorias-home', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Is-Master': isMaster ? 'true' : 'false' },
      body: JSON.stringify(nuevoForm),
    })
    const { data } = await res.json()
    if (data) setCategorias(prev => [...prev, data])
    setCreando(false)
    setNuevoForm({ nombre: '', descripcion: '', href: '', categoria_keys: [] })
    setSaving(false)
  }

  async function subirFoto(cat: CategoriaHome, file: File) {
    setUploadingId(cat.id)
    setUploadError(null)
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `categorias/${cat.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error } = await getSupabase().storage.from('multimedia').upload(path, file, { upsert: true })
    if (error) {
      setUploadError('Error al subir la imagen. Intentá de nuevo.')
      setUploadingId(null)
      return
    }

    if (cat.foto_url) await getSupabase().storage.from('multimedia').remove([cat.foto_url])

    await fetch('/api/categorias-home', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Is-Master': isMaster ? 'true' : 'false' },
      body: JSON.stringify({ id: cat.id, foto_url: path }),
    })
    setCategorias(prev => prev.map(c => c.id === cat.id ? { ...c, foto_url: path } : c))
    setForm(f => ({ ...f, foto_url: path }))
    setUploadingId(null)
  }

  async function eliminarCategoria(cat: CategoriaHome) {
    if (!confirm(`¿Eliminar "${cat.nombre}"? Esta acción no se puede deshacer.`)) return
    if (cat.foto_url) await getSupabase().storage.from('multimedia').remove([cat.foto_url])
    await fetch('/api/categorias-home', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'X-Is-Master': isMaster ? 'true' : 'false' },
      body: JSON.stringify({ id: cat.id }),
    })
    setCategorias(prev => prev.filter(c => c.id !== cat.id))
  }

  async function quitarFoto(cat: CategoriaHome) {
    if (!cat.foto_url) return
    await getSupabase().storage.from('multimedia').remove([cat.foto_url])
    await fetch('/api/categorias-home', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Is-Master': isMaster ? 'true' : 'false' },
      body: JSON.stringify({ id: cat.id, foto_url: null }),
    })
    setCategorias(prev => prev.map(c => c.id === cat.id ? { ...c, foto_url: null } : c))
  }

  return (
    <div className="max-w-2xl">
      <p className="text-sm mb-4" style={{ color: 'var(--color-acero-oscuro)' }}>
        Las categorías se crean y activan automáticamente desde Gesu al sincronizar productos. Usá este panel solo para agregar foto de portada, ajustar el orden o desactivar una categoría manualmente.
      </p>

      <div className="flex flex-col gap-3 mb-4">
        {categorias.map((cat, index) => (
          <div
            key={cat.id}
            className="rounded-xl border p-4"
            style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}
          >
            {editando === cat.id ? (
              <div className="flex flex-col gap-3">
                {/* Foto de portada — dentro del formulario */}
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-acero-oscuro)' }}>Foto de portada</p>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-20 h-24 rounded-lg overflow-hidden border-2 flex items-center justify-center flex-shrink-0 relative"
                      style={{ borderColor: form.foto_url ? 'var(--color-granito)' : 'var(--color-acero-claro)', background: 'var(--color-acero-brillo)' }}
                    >
                      {form.foto_url ? (
                        <Image
                          src={supabaseImg(SUPABASE_URL, form.foto_url, 128, { height: 160 })}
                          alt={cat.nombre}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : (
                        <ImagePlus size={22} style={{ color: 'var(--color-acero-oscuro)' }} />
                      )}
                      {uploadingId === cat.id && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="text-white text-xs">Subiendo…</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => editFileRef.current?.click()}
                        disabled={uploadingId === cat.id}
                        className="text-sm px-3 py-1.5 rounded-lg border flex items-center gap-1.5 disabled:opacity-50"
                        style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-granito-claro)' }}
                      >
                        <ImagePlus size={13} />
                        {form.foto_url ? 'Cambiar foto' : 'Subir foto'}
                      </button>
                      {form.foto_url && (
                        <button
                          type="button"
                          onClick={() => quitarFoto(cat)}
                          className="text-sm px-3 py-1.5 rounded-lg border flex items-center gap-1.5"
                          style={{ borderColor: '#fca5a5', color: '#dc2626' }}
                        >
                          <Trash2 size={13} /> Quitar foto
                        </button>
                      )}
                      {uploadError && (
                        <p className="text-xs" style={{ color: '#dc2626' }}>{uploadError}</p>
                      )}
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={editFileRef}
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) subirFoto(cat, file)
                      e.target.value = ''
                    }}
                  />
                </div>

                <input
                  value={form.nombre ?? ''}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Nombre"
                  className="text-base border rounded-lg px-3 py-1.5 outline-none w-full"
                  style={{ borderColor: 'var(--color-acero-claro)' }}
                />
                <input
                  value={form.descripcion ?? ''}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Descripción"
                  className="text-sm border rounded-lg px-3 py-1.5 outline-none w-full"
                  style={{ borderColor: 'var(--color-acero-claro)' }}
                />
                <input
                  value={form.href ?? ''}
                  onChange={e => setForm(f => ({ ...f, href: e.target.value }))}
                  placeholder="Link (ej: /tienda/mates)"
                  className="text-sm border rounded-lg px-3 py-1.5 outline-none w-full font-mono"
                  style={{ borderColor: 'var(--color-acero-claro)' }}
                />
                <GesuSelector
                  selected={(form.categoria_keys as string[]) ?? []}
                  available={gesuCategorias}
                  onChange={keys => setForm(f => ({ ...f, categoria_keys: keys }))}
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setEditando(null); setUploadError(null) }}
                    className="text-sm px-3 py-1.5 rounded-lg border"
                    style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}>
                    Cancelar
                  </button>
                  <button onClick={() => guardarEdicion(cat.id)} disabled={saving}
                    className="text-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                    style={{ background: 'var(--color-granito)', color: 'white' }}>
                    <Check size={12} /> Guardar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <button onClick={() => toggleActivo(cat)} className="mt-0.5 flex-shrink-0">
                  {cat.activo
                    ? <ToggleRight size={20} style={{ color: 'var(--color-granito)' }} />
                    : <ToggleLeft size={20} style={{ color: 'var(--color-acero)' }} />}
                </button>

                {/* Foto de portada */}
                <div className="flex-shrink-0 relative">
                  <div
                    className="w-16 h-20 rounded-lg overflow-hidden border-2 flex items-center justify-center"
                    style={{ borderColor: cat.foto_url ? 'var(--color-granito)' : 'var(--color-acero-claro)', background: 'var(--color-acero-brillo)' }}
                  >
                    {cat.foto_url ? (
                      <Image
                        src={supabaseImg(SUPABASE_URL, cat.foto_url, 128, { height: 160 })}
                        alt={cat.nombre}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <ImagePlus size={18} style={{ color: 'var(--color-acero-oscuro)' }} />
                    )}
                    {uploadingId === cat.id && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white text-[10px]">...</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 mt-1">
                    <button
                      onClick={() => fileRefs.current[cat.id]?.click()}
                      disabled={uploadingId === cat.id}
                      className="flex-1 text-[10px] px-1 py-0.5 rounded text-center transition-colors"
                      style={{ background: 'var(--color-acero-brillo)', color: 'var(--color-granito-claro)' }}
                    >
                      {cat.foto_url ? 'Cambiar' : 'Subir'}
                    </button>
                    {cat.foto_url && (
                      <button
                        onClick={() => quitarFoto(cat)}
                        className="p-0.5 rounded transition-colors"
                        style={{ color: '#ef4444' }}
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={el => { fileRefs.current[cat.id] = el }}
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) subirFoto(cat, file)
                      e.target.value = ''
                    }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-base font-medium" style={{ color: 'var(--foreground)' }}>{cat.nombre}</p>
                    {!cat.activo && (
                      <span className="text-sm px-1.5 py-0.5 rounded" style={{ background: '#fee2e2', color: '#b91c1c' }}>inactiva</span>
                    )}
                    {cat.foto_url && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#dcfce7', color: '#166534' }}>foto manual</span>
                    )}
                  </div>
                  <p className="text-sm mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>{cat.descripcion}</p>
                  <p className="text-sm font-mono mb-2" style={{ color: 'var(--color-acero)' }}>{cat.href}</p>
                  <div className="flex flex-wrap gap-1">
                    {(cat.categoria_keys ?? []).map(k => (
                      <span key={k} className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--color-acero-brillo)', color: 'var(--color-granito-claro)', border: '1px solid var(--color-acero-claro)' }}>
                        {k}
                      </span>
                    ))}
                    {(cat.categoria_keys ?? []).length === 0 && (
                      <span className="text-xs italic" style={{ color: 'var(--color-acero-oscuro)' }}>Sin categorías asignadas</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <div className="flex gap-1 justify-end">
                    <button
                      onClick={() => moverCategoria(cat.id, -1)}
                      disabled={index === 0}
                      title="Subir"
                      className="p-1 rounded-lg border disabled:opacity-30"
                      style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => moverCategoria(cat.id, 1)}
                      disabled={index === categorias.length - 1}
                      title="Bajar"
                      className="p-1 rounded-lg border disabled:opacity-30"
                      style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setEditando(cat.id)
                      setForm({ ...cat })
                    }}
                    className="text-sm px-2.5 py-1 rounded-lg border"
                    style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}
                  >
                    Editar
                  </button>
                  {!cat.activo && (
                    <button
                      onClick={() => eliminarCategoria(cat)}
                      className="text-sm px-2.5 py-1 rounded-lg border flex items-center gap-1 justify-center"
                      style={{ borderColor: '#fca5a5', color: '#dc2626' }}
                    >
                      <Trash2 size={11} /> Eliminar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Nueva categoría */}
      {creando ? (
        <div className="rounded-xl border p-4" style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}>
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--foreground)' }}>Nueva categoría</p>
          <div className="flex flex-col gap-2">
            <input value={nuevoForm.nombre} onChange={e => setNuevoForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Nombre" className="text-base border rounded-lg px-3 py-1.5 outline-none"
              style={{ borderColor: 'var(--color-acero-claro)' }} />
            <input value={nuevoForm.descripcion} onChange={e => setNuevoForm(f => ({ ...f, descripcion: e.target.value }))}
              placeholder="Descripción" className="text-sm border rounded-lg px-3 py-1.5 outline-none"
              style={{ borderColor: 'var(--color-acero-claro)' }} />
            <input value={nuevoForm.href} onChange={e => setNuevoForm(f => ({ ...f, href: e.target.value }))}
              placeholder="Link (ej: /tienda/mates)" className="text-sm border rounded-lg px-3 py-1.5 outline-none font-mono"
              style={{ borderColor: 'var(--color-acero-claro)' }} />
            <GesuSelector
              selected={nuevoForm.categoria_keys}
              available={gesuCategorias}
              onChange={keys => setNuevoForm(f => ({ ...f, categoria_keys: keys }))}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCreando(false)}
                className="text-sm px-3 py-1.5 rounded-lg border"
                style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}>
                <X size={12} />
              </button>
              <button onClick={crearCategoria} disabled={saving || !nuevoForm.nombre}
                className="text-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                style={{ background: 'var(--color-granito)', color: 'white' }}>
                <Check size={12} /> Crear
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => setCreando(true)}
          className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border transition-colors"
          style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}>
          <Plus size={13} /> Nueva categoría
        </button>
      )}
    </div>
  )
}
