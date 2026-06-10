'use client'

import { Printer, AlertTriangle, FileText } from 'lucide-react'
import { supabaseImg } from '@/lib/images'
import { formatPrecio } from '@/lib/utils'

interface ProductoCatalogo {
  id: number
  codigo_interno: string
  titulo: string
  categoria: string
  precio: number | null
  foto_url: string | null
}

interface CatalogoViewProps {
  productos: ProductoCatalogo[]
  config: {
    columnas: 2 | 3 | 4
    mostrarCodigo: boolean
    nombreCanal: string
  }
  supabaseUrl: string
  esPreview?: boolean
  previewCanal?: string
}

const GRID_COLS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
}

export function CatalogoView({ productos, config, supabaseUrl, esPreview, previewCanal }: CatalogoViewProps) {
  const porCategoria: Record<string, ProductoCatalogo[]> = {}
  for (const p of productos) {
    if (!porCategoria[p.categoria]) porCategoria[p.categoria] = []
    porCategoria[p.categoria].push(p)
  }

  return (
    <>
      <style>{`
        @media print {
          nav, footer, header, .print-hide { display: none !important; }
          .print-show { display: block !important; }
          .print-grid-show { display: grid !important; }
          @page { margin: 1.5cm; size: A4; }
          body { background: white !important; }
        }
      `}</style>

      {/* ── PANTALLA: solo el botón de descarga ── */}
      <div className="print-hide px-6 md:px-16 max-w-2xl mx-auto py-20 md:py-28">

        {esPreview && (
          <div
            className="mb-8 px-4 py-3 rounded-lg flex items-center gap-2 text-sm"
            style={{ background: '#fef3c7', color: '#92400e' }}
          >
            <AlertTriangle size={15} />
            Previsualizando como <strong className="ml-1">{previewCanal}</strong>
          </div>
        )}

        <h1
          className="text-4xl md:text-5xl leading-tight mb-3"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}
        >
          Catálogo
        </h1>
        <p className="text-sm mb-10" style={{ color: 'var(--color-acero-oscuro)' }}>
          {config.nombreCanal} · {productos.length} productos
        </p>

        {productos.length > 0 ? (
          <>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-3 px-8 py-4 text-sm font-medium tracking-wide uppercase transition-opacity hover:opacity-80"
              style={{ background: 'var(--color-granito)', color: 'white' }}
            >
              <Printer size={16} />
              Descargar catálogo
            </button>
            <p className="text-xs mt-4" style={{ color: 'var(--color-acero-oscuro)' }}>
              Se abre el diálogo de impresión — elegí &ldquo;Guardar como PDF&rdquo;.
            </p>
          </>
        ) : (
          <div
            className="rounded-xl border py-16 flex flex-col items-center gap-3"
            style={{ borderColor: 'var(--color-acero-claro)', borderStyle: 'dashed' }}
          >
            <FileText size={32} strokeWidth={1.2} style={{ color: 'var(--color-acero-claro)' }} />
            <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
              No hay productos disponibles para este canal.
            </p>
          </div>
        )}
      </div>

      {/* ── IMPRESIÓN: catálogo completo, invisible en pantalla ── */}
      <div className="print-show" style={{ display: 'none' }}>
        <div style={{ padding: '0', fontFamily: 'sans-serif' }}>

          {/* Encabezado del PDF */}
          <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 0.25rem' }}>Catálogo Reunata</h1>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              {config.nombreCanal} · {productos.length} productos
            </p>
          </div>

          {/* Productos por categoría */}
          {Object.entries(porCategoria).map(([categoria, prods]) => (
            <div key={categoria} style={{ marginBottom: '2.5rem' }}>
              <h2 style={{
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                fontWeight: 600,
                color: '#9ca3af',
                borderBottom: '1px solid #e5e7eb',
                paddingBottom: '0.4rem',
                marginBottom: '1rem',
              }}>
                {categoria}
              </h2>
              <div
                className={`print-grid-show ${GRID_COLS[config.columnas] ?? 'grid-cols-3'}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${config.columnas}, 1fr)`,
                  gap: '0.75rem',
                }}
              >
                {prods.map(p => (
                  <div
                    key={p.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      overflow: 'hidden',
                      breakInside: 'avoid',
                    }}
                  >
                    {/* Foto */}
                    <div style={{ aspectRatio: '1', background: '#f9fafb', overflow: 'hidden' }}>
                      {p.foto_url ? (
                        <img
                          src={supabaseImg(supabaseUrl, p.foto_url, 300)}
                          alt={p.titulo}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '0.65rem', color: '#d1d5db' }}>Sin foto</span>
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div style={{ padding: '0.5rem 0.625rem' }}>
                      <p style={{ fontSize: '0.7rem', fontWeight: 500, margin: '0 0 0.15rem', lineHeight: 1.3, color: '#111' }}>
                        {p.titulo}
                      </p>
                      {config.mostrarCodigo && (
                        <p style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: '#6b7280', margin: '0 0 0.15rem' }}>
                          {p.codigo_interno}
                        </p>
                      )}
                      {p.precio !== null && (
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, margin: 0, color: '#111' }}>
                          {formatPrecio(p.precio)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
