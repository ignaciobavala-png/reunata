'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Trash2, FileText, Loader2, ExternalLink } from 'lucide-react'
import { subirCatalogo, eliminarCatalogo, toggleCatalogoActivo } from '@/app/actions/catalogos'

export interface CatalogoItem {
  id: number
  titulo: string
  url: string
  activo: boolean
  created_at: string
  signedUrl: string
}

export function CatalogosClient({ catalogos }: { catalogos: CatalogoItem[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [toggling, setToggling] = useState<number | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubiendo(true)
    const form = e.currentTarget
    const fd = new FormData(form)
    const res = await subirCatalogo(fd)
    setSubiendo(false)
    if (!res.ok) { setError(res.error ?? 'Error al subir'); return }
    formRef.current?.reset()
    router.refresh()
  }

  function handleToggle(id: number, activo: boolean) {
    setToggling(id)
    startTransition(async () => {
      await toggleCatalogoActivo(id, !activo)
      setToggling(null)
      router.refresh()
    })
  }

  function handleDelete(id: number, url: string) {
    startTransition(async () => {
      await eliminarCatalogo(id, url)
      setConfirmDelete(null)
      router.refresh()
    })
  }

  const inputClass = "w-full px-3 py-2.5 text-sm rounded-lg border outline-none"
  const inputStyle = { borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }

  return (
    <div className="space-y-8">

      {/* Formulario de subida */}
      <div className="rounded-xl border p-6" style={{ borderColor: 'var(--color-acero-claro)', background: 'white' }}>
        <h2 className="text-base font-medium mb-5" style={{ color: 'var(--foreground)' }}>
          Subir catálogo
        </h2>
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-acero-oscuro)' }}>
              Nombre del catálogo
            </label>
            <input
              name="titulo"
              type="text"
              required
              placeholder="Ej: Lista de precios Distribuidor — Mayo 2026"
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-acero-oscuro)' }}>
              Archivo PDF (máx. 20 MB)
            </label>
            <input
              name="file"
              type="file"
              accept="application/pdf"
              required
              className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:cursor-pointer"
              style={{ color: 'var(--color-acero-oscuro)' }}
            />
          </div>

          {error && (
            <p className="text-sm px-3 py-2 rounded-lg" style={{ background: '#fee2e2', color: '#dc2626' }}>
              {error}
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={subiendo}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
              style={{ background: 'var(--foreground)', color: 'var(--color-acero-claro)' }}
            >
              {subiendo
                ? <><Loader2 size={14} className="animate-spin" /> Subiendo…</>
                : <><Upload size={14} /> Subir catálogo</>
              }
            </button>
          </div>
        </form>
      </div>

      {/* Lista de catálogos */}
      <div>
        <h2 className="text-base font-medium mb-4" style={{ color: 'var(--foreground)' }}>
          {catalogos.length} {catalogos.length === 1 ? 'catálogo' : 'catálogos'}
        </h2>

        {catalogos.length === 0 ? (
          <div
            className="rounded-xl border py-16 flex flex-col items-center gap-3"
            style={{ borderColor: 'var(--color-acero-claro)', borderStyle: 'dashed' }}
          >
            <FileText size={32} strokeWidth={1.2} style={{ color: 'var(--color-acero-claro)' }} />
            <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
              Todavía no hay catálogos subidos.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {catalogos.map(cat => (
              <div
                key={cat.id}
                className="rounded-xl border px-5 py-4 flex items-center gap-4"
                style={{
                  borderColor: 'var(--color-acero-claro)',
                  background: cat.activo ? 'white' : '#f9fafb',
                  opacity: cat.activo ? 1 : 0.65,
                }}
              >
                <FileText size={20} strokeWidth={1.3} style={{ color: 'var(--color-acero-oscuro)', flexShrink: 0 }} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                    {cat.titulo}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-acero-oscuro)' }}>
                    {new Date(cat.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                {/* Estado */}
                <button
                  onClick={() => handleToggle(cat.id, cat.activo)}
                  disabled={toggling === cat.id}
                  className="px-2.5 py-1 rounded-full text-xs font-medium transition-opacity disabled:opacity-40"
                  style={{
                    background: cat.activo ? '#dcfce7' : '#f3f4f6',
                    color: cat.activo ? '#16a34a' : '#6b7280',
                  }}
                >
                  {toggling === cat.id
                    ? <Loader2 size={10} className="animate-spin inline" />
                    : cat.activo ? 'Activo' : 'Inactivo'
                  }
                </button>

                {/* Descargar */}
                <a
                  href={cat.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Ver PDF"
                  className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-acero-oscuro)' }}
                >
                  <ExternalLink size={15} />
                </a>

                {/* Eliminar */}
                {confirmDelete === cat.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(cat.id, cat.url)}
                      className="text-xs px-2.5 py-1 rounded-lg font-medium"
                      style={{ background: '#fee2e2', color: '#dc2626' }}
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-xs px-2.5 py-1 rounded-lg"
                      style={{ background: '#f3f4f6', color: '#6b7280' }}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(cat.id)}
                    className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
                    style={{ color: 'var(--color-acero-oscuro)' }}
                    title="Eliminar"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
