'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ImageIcon } from 'lucide-react'

interface ProductoPublico {
  id: number
  titulo: string
  codigo_interno: string
  foto_url: string | null
  supabaseUrl: string
}

export function ProductGridPublic({
  productos,
  nombreCategoria,
}: {
  productos: ProductoPublico[]
  nombreCategoria: string
}) {
  if (productos.length === 0) return null

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {productos.map((p) => (
          <div key={p.id} className="group">
            <div
              className="w-full aspect-[3/4] mb-3 relative overflow-hidden"
              style={{ border: '1px solid var(--border)' }}
            >
              {p.foto_url ? (
                <Image
                  src={`${p.supabaseUrl}/storage/v1/object/public/multimedia/${p.foto_url}`}
                  alt={p.titulo}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 25vw"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--color-acero-claro)' }}>
                  <ImageIcon size={24} style={{ color: 'var(--color-acero-oscuro)' }} />
                </div>
              )}
            </div>
            <p className="text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>
              {p.titulo}
            </p>
            <p className="text-[10px] font-mono" style={{ color: 'var(--color-acero-oscuro)' }}>
              {p.codigo_interno}
            </p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div
        className="mt-16 py-10 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div>
          <p className="text-lg font-medium mb-1" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
            ¿Querés ver precios y hacer pedidos?
          </p>
          <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
            Registrate para ver precios, stock y hacer pedidos de {nombreCategoria.toLowerCase()}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/trabaja-con-nosotros"
            className="px-6 py-3 text-xs tracking-widest uppercase transition-colors"
            style={{ background: 'var(--color-granito)', color: 'white' }}
          >
            Quiero ser cliente
          </Link>
          <Link
            href="/login"
            className="text-xs tracking-widest uppercase hover:underline"
            style={{ color: 'var(--color-granito-claro)' }}
          >
            Ya tengo cuenta
          </Link>
        </div>
      </div>
    </div>
  )
}
