'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { agregarPost, eliminarPost, actualizarCaption, reordenarPosts } from '@/app/actions/instagram'
import type { PostInstagram } from '@/app/actions/instagram'
import { Loader2, CheckCircle, X, Plus, GripVertical, Upload } from 'lucide-react'
import Image from 'next/image'

export function InstagramClient({ posts: postsIniciales }: { posts: PostInstagram[] }) {
  const supabase = createClient()
  const router = useRouter()
  const [posts, setPosts] = useState<PostInstagram[]>(postsIniciales)
  const [caption, setCaption] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [editando, setEditando] = useState<Record<number, string>>({})
  const dragIdx = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return

    setSubiendo(true)
    try {
      const ext = 'webp'
      const path = `comunidad/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('multimedia')
        .upload(path, file, { contentType: 'image/webp', upsert: false })

      if (uploadError) throw new Error(uploadError.message)

      const thumbnail_url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/multimedia/${path}`

      const res = await agregarPost(thumbnail_url, caption || undefined)
      if (!res.ok) throw new Error(res.error)

      setPosts(prev => [...prev, {
        id: Date.now(),
        thumbnail_url,
        caption: caption || null,
        orden: prev.length,
        url_instagram: null,
        permalink: null,
        username: null,
        activo: true,
        created_at: new Date().toISOString(),
      }])
      setCaption('')
      mostrarToast('Imagen agregada correctamente')
      router.refresh()
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : 'Error al subir')
    } finally {
      setSubiendo(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleEliminar(post: PostInstagram) {
    const anterior = posts
    setPosts(prev => prev.filter(p => p.id !== post.id))

    const storagePath = post.thumbnail_url?.includes('/multimedia/')
      ? post.thumbnail_url.split('/multimedia/')[1]
      : undefined

    try {
      const res = await eliminarPost(post.id, storagePath)
      if (!res.ok) setPosts(anterior)
      else router.refresh()
    } catch {
      setPosts(anterior)
    }
  }

  async function handleSaveCaption(id: number) {
    const caption = editando[id]?.trim() ?? ''
    const anterior = posts
    setPosts(prev => prev.map(p => p.id === id ? { ...p, caption } : p))
    setEditando(prev => { const n = { ...prev }; delete n[id]; return n })

    try {
      const res = await actualizarCaption(id, caption)
      if (!res.ok) setPosts(anterior)
      else router.refresh()
    } catch {
      setPosts(anterior)
    }
  }

  function handleDragStart(idx: number) {
    dragIdx.current = idx
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    if (dragIdx.current === null || dragIdx.current === idx) return
    setPosts(prev => {
      const copy = [...prev]
      const [moved] = copy.splice(dragIdx.current!, 1)
      copy.splice(idx, 0, moved)
      return copy
    })
    dragIdx.current = idx
  }

  async function handleDragEnd() {
    dragIdx.current = null
    await reordenarPosts(posts.map(p => p.id))
    router.refresh()
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

      {/* Upload */}
      <div className="flex-shrink-0 mb-6 max-w-xl space-y-3">
        <div
          onClick={() => inputRef.current?.click()}
          className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-8 cursor-pointer transition-colors"
          style={{ borderColor: 'var(--color-acero-claro)' }}
        >
          <Upload size={24} strokeWidth={1.5} style={{ color: 'var(--color-acero-oscuro)' }} />
          <p className="text-sm mt-2 mb-1 font-medium" style={{ color: 'var(--foreground)' }}>
            {subiendo ? 'Subiendo…' : 'Hacé click para seleccionar una imagen'}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
            Se mostrará en el carrusel de Comunidad en la página principal
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFile}
            disabled={subiendo}
          />
        </div>

        <div className="flex gap-2">
          <input
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Descripción opcional…"
            className="flex-1 px-3 py-2.5 text-sm rounded-lg border outline-none"
            style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
          />
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {posts.length === 0 ? (
          <div className="py-12 text-center text-sm rounded-xl border-2 border-dashed"
            style={{ color: 'var(--color-acero-oscuro)', borderColor: 'var(--color-acero-claro)' }}>
            No hay imágenes. Subí la primera arriba.
          </div>
        ) : (
          <div className="max-w-xl space-y-2 pb-6">
            {posts.map((post, idx) => (
              <div
                key={post.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={e => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors group cursor-grab active:cursor-grabbing"
                style={{ borderColor: 'var(--color-acero-claro)', background: 'white' }}
              >
                <GripVertical size={14} className="opacity-30 group-hover:opacity-60 flex-shrink-0" style={{ color: 'var(--color-acero-oscuro)' }} />

                <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 relative bg-gray-100">
                  {post.thumbnail_url && (
                    <Image src={post.thumbnail_url} alt={post.caption ?? ''} fill className="object-cover" sizes="56px" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {editando[post.id] !== undefined ? (
                    <input
                      value={editando[post.id]}
                      onChange={e => setEditando(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onBlur={() => handleSaveCaption(post.id)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveCaption(post.id)}
                      className="w-full px-2 py-1 text-sm border rounded outline-none"
                      style={{ borderColor: 'var(--color-acero-claro)' }}
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => setEditando(prev => ({ ...prev, [post.id]: post.caption ?? '' }))}
                      className="text-sm truncate w-full text-left"
                      style={{ color: post.caption ? 'var(--foreground)' : 'var(--color-acero-oscuro)' }}
                    >
                      {post.caption || 'Agregar descripción'}
                    </button>
                  )}
                </div>

                <span className="text-xs font-mono opacity-40 flex-shrink-0" style={{ color: 'var(--color-acero-oscuro)' }}>
                  {idx + 1}
                </span>

                <button
                  onClick={() => handleEliminar(post)}
                  className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                >
                  <X size={12} style={{ color: '#ef4444' }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
