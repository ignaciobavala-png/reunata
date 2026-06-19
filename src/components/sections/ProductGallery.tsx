'use client'

import Image from 'next/image'
import { useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { supabaseImg } from '@/lib/images'

interface Props {
  fotos: { url: string; orden: number }[]
  titulo: string
  supabaseUrl: string
}

export function ProductGallery({ fotos, titulo, supabaseUrl }: Props) {
  const [activa, setActiva] = useState(0)

  if (fotos.length === 0) {
    return (
      <div
        className="aspect-square flex items-center justify-center"
        style={{ background: 'var(--color-acero-claro)', border: '1px solid var(--border)' }}
      >
        <ImageIcon size={32} style={{ color: 'var(--color-acero-oscuro)' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Foto principal */}
      <div
        className="w-full aspect-square relative overflow-hidden"
        style={{ border: '1px solid var(--border)', background: 'var(--color-acero-claro)' }}
      >
        <Image
          src={supabaseImg(supabaseUrl, fotos[activa].url)}
          alt={titulo}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>

      {/* Miniaturas — solo si hay más de una foto */}
      {fotos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {fotos.map((f, i) => (
            <button
              key={i}
              onClick={() => setActiva(i)}
              className="flex-shrink-0 relative overflow-hidden transition-opacity"
              style={{
                width: 64,
                height: 85,
                border: i === activa ? '2px solid var(--foreground)' : '1px solid var(--border)',
                opacity: i === activa ? 1 : 0.6,
              }}
              aria-label={`Foto ${i + 1}`}
            >
              <Image
                src={supabaseImg(supabaseUrl, f.url)}
                alt={`${titulo} — foto ${i + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
