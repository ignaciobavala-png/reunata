'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Eye, Upload, Trash2, FileText, Loader2, ExternalLink,
  ChevronDown, ChevronUp, Check,
} from 'lucide-react'
import {
  subirCatalogo, eliminarCatalogo, toggleCatalogoActivo, guardarConfigCatalogo,
} from '@/app/actions/catalogos'

export interface CatalogoItem {
  id: number
  titulo: string
  url: string
  activo: boolean
  created_at: string
  signedUrl: string
}

interface Canal {
  id: number
  nombre: string
  slug: string
}

interface Props {
  canales: Canal[]
  configMap: Record<string, string>
  pdfs: CatalogoItem[]
}

const CANAL_DESCRIPCION: Record<string, string> = {
  consumidor_final: 'Lista pública — precios Lista 5',
  distribuidor:     'Pool de compra — precios Lista 3',
  local:            'Local comercial — precios Lista 3',
  mercha:           'Merchandising — precios Lista 3',
}

const CANAL_COLOR: Record<string, string> = {
  consumidor_final: '#6366f1',
  distribuidor:     '#0ea5e9',
  local:            '#10b981',
  mercha:           '#f59e0b',
}

export function CatalogosClient({ canales, configMap, pdfs }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  // --- Config state ---
  const [mostrarCodigo, setMostrarCodigo] = useState(configMap['catalogo_mostrar_codigo'] !== 'false')
  const [columnas, setColumnas] = useState(configMap['catalogo_columnas'] ?? '3')
  const [guardando, setGuardando] = useState(false)
  const [guardadoOk, setGuardadoOk] = useState(false)

  async function handleGuardarConfig() {
    setGuardando(true)
    await guardarConfigCatalogo({ mostrarCodigo, columnas })
    setGuardando(false)
    setGuardadoOk(true)
    setTimeout(() => setGuardadoOk(false), 2000)
  }

  // --- PDF state ---
  const [docsAbierto, setDocsAbierto] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [errorUpload, setErrorUpload] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [toggling, setToggling] = useState<number | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmitPdf(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorUpload(null)
    setSubiendo(true)
    const fd = new FormData(e.currentTarget)
    const res = await subirCatalogo(fd)
    setSubiendo(false)
    if (!res.ok) { setErrorUpload(res.error ?? 'Error al subir'); return }
    formRef.current?.reset()
    router.refresh()
  }

  function handleTogglePdf(id: number, activo: boolean) {
    setToggling(id)
    startTransition(async () => {
      await toggleCatalogoActivo(id, !activo)
      setToggling(null)
      router.refresh()
    })
  }

  function handleDeletePdf(id: number, url: string) {
    startTransition(async () => {
      await eliminarCatalogo(id, url)
      setConfirmDelete(null)
      router.refresh()
    })
  }

  const card = "rounded-xl border p-5"
  const cardStyle = { borderColor: 'var(--color-acero-claro)', background: 'white' }
  const inputStyle = { borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }

  return (
    <div className="space-y-8">

      {/* 1 — Vista previa por canal */}
      <section>
        <h2 className="text-base font-medium mb-1" style={{ color: 'var(--foreground)' }}>
          Vista previa por canal
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--color-acero-oscuro)' }}>
          Abrí el catálogo como lo ve cada tipo de usuario.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {canales.map(canal => (
            <div key={canal.id} className={card} style={cardStyle}>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: CANAL_COLOR[canal.slug] ?? '#9ca3af' }}
                />
                <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  {canal.nombre}
                </span>
              </div>
              <p className="text-xs mb-4" style={{ color: 'var(--color-acero-oscuro)' }}>
                {CANAL_DESCRIPCION[canal.slug] ?? ''}
              </p>
              <a
                href={`/catalogo?preview=${canal.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-75"
                style={{ background: 'var(--foreground)', color: 'white' }}
              >
                <Eye size={12} />
                Ver catálogo
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* 2 — Configuración del catálogo */}
      <section className={card} style={cardStyle}>
        <h2 className="text-base font-medium mb-5" style={{ color: 'var(--foreground)' }}>
          Configuración del catálogo
        </h2>

        <div className="space-y-5">
          {/* Mostrar código */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setMostrarCodigo(v => !v)}
              className="w-5 h-5 rounded flex items-center justify-center border transition-colors flex-shrink-0"
              style={{
                background: mostrarCodigo ? 'var(--foreground)' : 'white',
                borderColor: mostrarCodigo ? 'var(--foreground)' : 'var(--color-acero-claro)',
              }}
            >
              {mostrarCodigo && <Check size={12} strokeWidth={3} color="white" />}
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Mostrar código interno
              </p>
              <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                El código de Gesu aparece debajo del nombre del producto
              </p>
            </div>
          </label>

          {/* Columnas */}
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
              Columnas por fila
            </p>
            <div className="flex gap-2">
              {['2', '3', '4'].map(n => (
                <button
                  key={n}
                  onClick={() => setColumnas(n)}
                  className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                  style={{
                    background: columnas === n ? 'var(--foreground)' : 'white',
                    color: columnas === n ? 'white' : 'var(--color-acero-oscuro)',
                    borderColor: columnas === n ? 'var(--foreground)' : 'var(--color-acero-claro)',
                  }}
                >
                  {n} col.
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleGuardarConfig}
            disabled={guardando}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ background: 'var(--foreground)', color: 'white' }}
          >
            {guardando
              ? <><Loader2 size={14} className="animate-spin" /> Guardando…</>
              : guardadoOk
                ? <><Check size={14} /> Guardado</>
                : 'Guardar configuración'
            }
          </button>
        </div>
      </section>

      {/* 3 — Documentos complementarios (colapsable) */}
      <section>
        <button
          onClick={() => setDocsAbierto(v => !v)}
          className="flex items-center gap-2 text-sm font-medium mb-3"
          style={{ color: 'var(--color-acero-oscuro)' }}
        >
          {docsAbierto ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          Documentos complementarios ({pdfs.length})
        </button>

        {docsAbierto && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
              PDFs adicionales (listas especiales, términos, etc.) que se muestran como descarga junto al catálogo.
            </p>

            {/* Subir PDF */}
            <div className={card} style={cardStyle}>
              <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--foreground)' }}>
                Subir documento
              </h3>
              <form ref={formRef} onSubmit={handleSubmitPdf} className="flex flex-col gap-4">
                <input
                  name="titulo"
                  type="text"
                  required
                  placeholder="Nombre del documento"
                  className="w-full px-3 py-2.5 text-sm rounded-lg border outline-none"
                  style={inputStyle}
                />
                <input
                  name="file"
                  type="file"
                  accept="application/pdf"
                  required
                  className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:cursor-pointer"
                  style={{ color: 'var(--color-acero-oscuro)' }}
                />
                {errorUpload && (
                  <p className="text-sm px-3 py-2 rounded-lg" style={{ background: '#fee2e2', color: '#dc2626' }}>
                    {errorUpload}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={subiendo}
                  className="self-start flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
                  style={{ background: 'var(--foreground)', color: 'white' }}
                >
                  {subiendo
                    ? <><Loader2 size={14} className="animate-spin" /> Subiendo…</>
                    : <><Upload size={14} /> Subir PDF</>
                  }
                </button>
              </form>
            </div>

            {/* Lista de PDFs */}
            {pdfs.length > 0 && (
              <div className="flex flex-col gap-2">
                {pdfs.map(cat => (
                  <div
                    key={cat.id}
                    className="rounded-xl border px-5 py-4 flex items-center gap-4"
                    style={{
                      borderColor: 'var(--color-acero-claro)',
                      background: cat.activo ? 'white' : '#f9fafb',
                      opacity: cat.activo ? 1 : 0.65,
                    }}
                  >
                    <FileText size={18} strokeWidth={1.3} style={{ color: 'var(--color-acero-oscuro)', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                        {cat.titulo}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-acero-oscuro)' }}>
                        {new Date(cat.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    <button
                      onClick={() => handleTogglePdf(cat.id, cat.activo)}
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

                    <a
                      href={cat.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
                      style={{ color: 'var(--color-acero-oscuro)' }}
                    >
                      <ExternalLink size={15} />
                    </a>

                    {confirmDelete === cat.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeletePdf(cat.id, cat.url)}
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
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {pdfs.length === 0 && (
              <div
                className="rounded-xl border py-10 flex flex-col items-center gap-2"
                style={{ borderColor: 'var(--color-acero-claro)', borderStyle: 'dashed' }}
              >
                <FileText size={28} strokeWidth={1.2} style={{ color: 'var(--color-acero-claro)' }} />
                <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
                  No hay documentos subidos.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

    </div>
  )
}
