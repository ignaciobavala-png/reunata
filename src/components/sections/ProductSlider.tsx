'use client'

import useEmblaCarousel from 'embla-carousel-react'
import { FadeIn } from '@/components/ui/FadeIn'
import Link from 'next/link'
import Image from 'next/image'

export interface FotoDestacada {
  id: number
  url: string
  producto_id: number
  titulo: string
  codigo_interno: string
  supabaseUrl: string
}

export function ProductSlider({ fotos }: { fotos: FotoDestacada[] }) {
  const [emblaRef] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    loop: false,
  })

  if (fotos.length === 0) return null

  return (
    <section className="py-16 md:py-24 overflow-hidden">
      <FadeIn className="px-6 md:px-10 mb-10 flex items-end justify-between">
        <h2
          className="text-3xl md:text-4xl text-[var(--foreground)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Más elegidos
        </h2>
        <Link
          href="/tienda"
          className="text-[10px] tracking-widest uppercase text-[var(--color-granito-claro)] hover:text-[var(--foreground)] transition-colors"
        >
          Ver todo
        </Link>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div ref={emblaRef} className="overflow-hidden cursor-grab active:cursor-grabbing">
          <div className="flex gap-3 pl-6 md:pl-10 pr-6">
            {fotos.map((foto) => (
              <div key={foto.id} className="group flex-none w-[200px] md:w-[240px]">
                <div
                  className="w-full aspect-[3/4] mb-4 relative overflow-hidden"
                  style={{ border: '1px solid var(--border)' }}
                >
                  <Image
                    src={`${foto.supabaseUrl}/storage/v1/object/public/multimedia/${foto.url}`}
                    alt={foto.titulo}
                    fill
                    className="object-cover"
                    sizes="240px"
                  />
                </div>
                <p className="text-[10px] tracking-widest uppercase text-[var(--foreground)] mb-1">
                  {foto.titulo}
                </p>
                <p className="text-[10px] tracking-wider text-[var(--color-acero-oscuro)]">
                  {foto.codigo_interno}
                </p>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>
    </section>
  )
}
