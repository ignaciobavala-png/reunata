'use client'

import { useState, useRef } from 'react'
import { Plus, Check, X, ToggleLeft, ToggleRight, ImagePlus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { supabaseImg } from '@/lib/images'

const supabase = createClient()
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

interface CategoriaHome {
  id: number
  nombre: string
  descripcion: string | null
  href: string | null
  activo: boolean
  categoria_keys: string[]
  foto_url: string | null
}

export function CategoriasClient({
  categoriasIniciales,
  isMaster,
}: {
  categoriasIniciales: CategoriaHome[]
  isMaster: boolean
}) {
  const [categorias, setCategorias] = useState<CategoriaHome[]>(categoriasIniciales)
  const [editando, setEditando] = useState<number | null>(null)
  const [form, setForm] = useState<Partial<CategoriaHome>>({})
  const [creando, setCreando] = useState(false)
  const [nuevoForm, setNuevoForm] = useState({ nombre: '', descripcion: '', href: '', categoria_keys: '' })
  const [saving, setSaving] = useState(false)
  const [uploadingId, setUploadingId] = useState<number | null>(null)
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({})

  async function toggleActivo(cat: CategoriaHome) {
    await fetch('/api/categorias-home', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Is-Master': isMaster ? 'true' : 'false' },
      body: JSON.stringify({ id: cat.id, activo: !cat.activo }),
    })
    setCategorias(prev => prev.map(c => c.id === cat.id ? { ...c, activo: !c.activo } : c))
  }

  async function guardarEdicion(id: number) {
    setSaving(true)
    const keys = typeof form.categoria_keys === 'string'
      ? (form.categoria_keys as unknown as string).split('\n').map(s => s.trim()).filter(Boolean)
      : form.categoria_keys ?? []

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
    const keys = nuevoForm.categoria_keys.split('\n').map(s => s.trim()).filter(Boolean)
    const res = await fetch('/api/categorias-home', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Is-Master': isMaster ? 'true' : 'false' },
      body: JSON.stringify({ ...nuevoForm, categoria_keys: keys }),
    })
    const { data } = await res.json()
    if (data) setCategorias(prev => [...prev, data])
    setCreando(false)
    setNuevoForm({ nombre: '', descripcion: '', href: '', categoria_keys: '' })
    setSaving(false)
  }

  async function subirFoto(cat: CategoriaHome, file: File) {
    setUploadingId(cat.id)
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `categorias/${cat.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error } = await supabase.storage.from('multimedia').upload(path, file, { upsert: true })
    if (error) { setUploadingId(null); return }

    // Eliminar foto anterior si existe
    if (cat.foto_url) {
      await supabase.storage.from('multimedia').remove([cat.foto_url])
    }

    await fetch('/api/categorias-home', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Is-Master': isMaster ? 'true' : 'false' },
      body: JSON.stringify({ id: cat.id, foto_url: path }),
    })
    setCategorias(prev => prev.map(c => c.id === cat.id ? { ...c, foto_url: path } : c))
    setUploadingId(null)
  }

  async function quitarFoto(cat: CategoriaHome) {
    if (!cat.foto_url) return
    await supabase.storage.from('multimedia').remove([cat.foto_url])
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
        Estas categorías aparecen en el bento de la página principal. Podés definir una foto de portada o se elegirá automáticamente de los productos asociados.
      </p>

      <div className="flex flex-col gap-3 mb-4">
        {categorias.map(cat => (
          <div
            key={cat.id}
            className="rounded-xl border p-4"
            style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}
          >
            {editando === cat.id ? (
              <div className="flex flex-col gap-2">
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
                <textarea
                  value={(form.categoria_keys as unknown as string) ?? cat.categoria_keys.join('\n')}
                  onChange={e => setForm(f => ({ ...f, categoria_keys: e.target.value as unknown as string[] }))}
                  placeholder="Categorías Gesu (una por línea)"
                  rows={4}
                  className="text-sm border rounded-lg px-3 py-1.5 outline-none w-full font-mono resize-none"
                  style={{ borderColor: 'var(--color-acero-claro)' }}
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditando(null)}
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
                      title="Subir foto de portada"
                    >
                      {cat.foto_url ? 'Cambiar' : 'Subir'}
                    </button>
                    {cat.foto_url && (
                      <button
                        onClick={() => quitarFoto(cat)}
                        className="p-0.5 rounded transition-colors"
                        style={{ color: '#ef4444' }}
                        title="Quitar foto de portada"
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
                    {cat.categoria_keys.map(k => (
                      <span key={k} className="text-sm px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--color-acero-brillo)', color: 'var(--color-granito-claro)' }}>
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setEditando(cat.id)
                    setForm({ ...cat, categoria_keys: cat.categoria_keys.join('\n') as unknown as string[] })
                  }}
                  className="text-sm px-2.5 py-1 rounded-lg border flex-shrink-0"
                  style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}
                >
                  Editar
                </button>
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
              placeholder="Link (ej: /tienda/termos)" className="text-sm border rounded-lg px-3 py-1.5 outline-none font-mono"
              style={{ borderColor: 'var(--color-acero-claro)' }} />
            <textarea value={nuevoForm.categoria_keys}
              onChange={e => setNuevoForm(f => ({ ...f, categoria_keys: e.target.value }))}
              placeholder="Categorías Gesu (una por línea)" rows={3}
              className="text-sm border rounded-lg px-3 py-1.5 outline-none font-mono resize-none"
              style={{ borderColor: 'var(--color-acero-claro)' }} />
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
