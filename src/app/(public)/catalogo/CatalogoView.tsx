'use client'

import Image from 'next/image'
import { Printer, Eye, ImageIcon } from 'lucide-react'
import { supabaseImg } from '@/lib/images'
import { formatPrecio } from '@/lib/utils'

interface ProductoCatalogo {
  id: number
  titulo: string
  codigo_interno: string
  foto_url: string | null
  precio: number | null
  supabaseUrl: string
}

interface Props {
  productos: ProductoCatalogo[]
  nombreCanal: string
  mostrarPrecios: boolean
  mostrarCodigo: boolean
  columnas: number
  isAdminPreview: boolean
}

const GRID_COLS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-4',
}

export function CatalogoView({ productos, nombreCanal, mostrarPrecios, mostrarCodigo, columnas, isAdminPreview }: Props) {
  const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <>
      {/* Banner admin preview — oculto al imprimir */}
      {isAdminPreview && (
        <div
          className="print:hidden sticky top-0 z-50 px-6 py-2.5 flex items-center gap-2 text-sm"
          style={{ background: '#fef3c7', color: '#92400e', borderBottom: '1px solid #fde68a' }}
        >
          <Eye size={14} />
          Vista previa del canal <strong className="ml-1">{nombreCanal}</strong> — así lo ven sus usuarios.
        </div>
      )}

      <div className="px-6 md:px-16 max-w-7xl mx-auto py-16 print:py-6 print:px-6">

        {/* Encabezado */}
        <div className="flex items-start justify-between mb-12 print:mb-8">
          <div>
            <h1
              className="text-4xl md:text-5xl print:text-3xl leading-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}
            >
              Catálogo Reunata
            </h1>
            <p className="text-sm mt-2" style={{ color: 'var(--color-acero-oscuro)' }}>
              {nombreCanal} · {productos.length} productos · {fecha}
            </p>
          </div>

          {/* Botón imprimir — oculto al imprimir */}
          <button
            onClick={() => window.print()}
            className="print:hidden flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-lg transition-opacity hover:opacity-80 flex-shrink-0 ml-6"
            style={{ background: 'var(--foreground)', color: 'white' }}
          >
            <Printer size={15} />
            Guardar PDF
          </button>
        </div>

        {/* Grilla de productos */}
        <div className={`grid ${GRID_COLS[columnas] ?? GRID_COLS[3]} gap-4 print:gap-3`}>
          {productos.map(p => (
            <div key={p.id} className="break-inside-avoid">
              {/* Foto */}
              <div
                className="w-full aspect-[3/4] relative overflow-hidden mb-2"
                style={{ border: '1px solid var(--border)' }}
              >
                {p.foto_url ? (
                  <Image
                    src={supabaseImg(p.supabaseUrl, p.foto_url, 400, { height: 533 })}
                    alt={p.titulo}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                    loading="eager"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: 'var(--color-acero-claro)' }}
                  >
                    <ImageIcon size={24} style={{ color: 'var(--color-acero-oscuro)' }} />
                  </div>
                )}
              </div>

              {/* Info */}
              <p className="text-sm font-medium leading-snug" style={{ color: 'var(--foreground)' }}>
                {p.titulo}
              </p>
              {mostrarCodigo && (
                <p className="text-xs font-mono" style={{ color: 'var(--color-acero-oscuro)' }}>
                  {p.codigo_interno}
                </p>
              )}
              {mostrarPrecios && p.precio != null && (
                <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--foreground)' }}>
                  {formatPrecio(p.precio)}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Pie de página — solo al imprimir */}
        <div
          className="hidden print:block mt-10 pt-4 text-center text-xs"
          style={{ borderTop: '1px solid var(--border)', color: 'var(--color-acero-oscuro)' }}
        >
          Reunata · reunata.com.ar · Catálogo generado el {fecha}
        </div>

      </div>
    </>
  )
}
