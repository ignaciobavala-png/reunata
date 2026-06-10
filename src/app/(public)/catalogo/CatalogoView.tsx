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
          .print\\:hidden { display: none !important; }
          nav, footer, header { display: none !important; }
          @page { margin: 1.5cm; size: A4; }
          body { background: white !important; }
        }
      `}</style>

      <div className="px-6 md:px-16 max-w-6xl mx-auto py-12">

        {/* Banner preview admin — solo visible en pantalla */}
        {esPreview && (
          <div
            className="print:hidden mb-6 px-4 py-3 rounded-lg flex items-center gap-2 text-sm"
            style={{ background: '#fef3c7', color: '#92400e' }}
          >
            <AlertTriangle size={15} />
            Previsualizando como <strong className="ml-1">{previewCanal}</strong> — los clientes de este canal ven este catálogo
          </div>
        )}

        {/* Header pantalla */}
        <div className="print:hidden flex items-start justify-between mb-8">
          <div>
            <h1
              className="text-4xl md:text-5xl leading-tight mb-2"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}
            >
              Catálogo
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
              {config.nombreCanal} · {productos.length} productos
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium flex-shrink-0 mt-2"
            style={{ background: 'var(--color-granito)', color: 'white' }}
          >
            <Printer size={15} />
            Descargar / Imprimir
          </button>
        </div>

        {/* Header impresión */}
        <div className="hidden print:block text-center mb-10">
          <h1 className="text-2xl font-bold mb-1">Catálogo Reunata</h1>
          <p className="text-sm text-gray-500">{config.nombreCanal} · {productos.length} productos</p>
        </div>

        {/* Sin productos */}
        {productos.length === 0 && (
          <div
            className="rounded-xl border py-20 flex flex-col items-center gap-3"
            style={{ borderColor: 'var(--color-acero-claro)', borderStyle: 'dashed' }}
          >
            <FileText size={32} strokeWidth={1.2} style={{ color: 'var(--color-acero-claro)' }} />
            <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
              No hay productos disponibles para este canal.
            </p>
          </div>
        )}

        {/* Grilla por categoría */}
        {Object.entries(porCategoria).map(([categoria, prods]) => (
          <section key={categoria} className="mb-10">
            <h2
              className="text-xs tracking-widest uppercase font-semibold mb-4 pb-2 border-b"
              style={{ color: 'var(--color-acero-oscuro)', borderColor: 'var(--color-acero-claro)' }}
            >
              {categoria}
            </h2>
            <div className={`grid ${GRID_COLS[config.columnas] ?? 'grid-cols-3'} gap-3`}>
              {prods.map(p => (
                <div
                  key={p.id}
                  className="rounded-lg border overflow-hidden"
                  style={{ borderColor: 'var(--color-acero-claro)', breakInside: 'avoid' }}
                >
                  {/* Foto */}
                  <div className="aspect-square bg-gray-50 overflow-hidden">
                    {p.foto_url ? (
                      <img
                        src={supabaseImg(supabaseUrl, p.foto_url, 400)}
                        alt={p.titulo}
                        className="w-full h-full object-cover"
                        loading="eager"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText size={24} strokeWidth={1} style={{ color: 'var(--color-acero-claro)' }} />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2.5">
                    <p
                      className="text-xs font-medium leading-snug"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {p.titulo}
                    </p>
                    {config.mostrarCodigo && (
                      <p
                        className="text-xs font-mono mt-0.5"
                        style={{ color: 'var(--color-acero-oscuro)' }}
                      >
                        {p.codigo_interno}
                      </p>
                    )}
                    {p.precio !== null && (
                      <p
                        className="text-sm font-semibold mt-1.5"
                        style={{ color: 'var(--foreground)' }}
                      >
                        {formatPrecio(p.precio)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

      </div>
    </>
  )
}
