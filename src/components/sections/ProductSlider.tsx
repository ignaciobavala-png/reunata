'use client'

import useEmblaCarousel from 'embla-carousel-react'
import { FadeIn } from '@/components/ui/FadeIn'
import Link from 'next/link'

const products = [
  { id: 1, name: 'Mate Imperial', price: '$18.500', gradient: 'from-[#1A1D21] via-[#2E3135] to-[#111316]', slug: 'mate-imperial' },
  { id: 2, name: 'Termo Oslo 500ml', price: '$32.000', gradient: 'from-[#ECEEF1] via-[#D4D9E0] to-[#A8B0BB]', slug: 'termo-oslo' },
  { id: 3, name: 'Set Nórdico', price: '$56.000', gradient: 'from-[#3A3D42] to-[#6E7882]', slug: 'set-nordico' },
  { id: 4, name: 'Bombilla Filato', price: '$8.200', gradient: 'from-[#6E7882] to-[#2E3135]', slug: 'bombilla-filato' },
  { id: 5, name: 'Mate Calabaza Pro', price: '$21.000', gradient: 'from-[#111316] to-[#3A3D42]', slug: 'mate-calabaza-pro' },
  { id: 6, name: 'Termo Onyx 1L', price: '$44.500', gradient: 'from-[#A8B0BB] to-[#ECEEF1]', slug: 'termo-onyx' },
]

export function ProductSlider() {
  const [emblaRef] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    loop: false,
  })

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
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/tienda/${product.slug}`}
                className="group flex-none w-[200px] md:w-[240px]"
              >
                {/* Product image — 3:4 ratio */}
                <div
                  className={`w-full aspect-[3/4] bg-gradient-to-b ${product.gradient} mb-4`}
                  style={{ border: '1px solid var(--border)' }}
                />
                {/* Product info */}
                <p className="text-[10px] tracking-widest uppercase text-[var(--foreground)] mb-1">
                  {product.name}
                </p>
                <p className="text-[10px] tracking-wider text-[var(--color-acero-oscuro)]">
                  {product.price}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </FadeIn>
    </section>
  )
}
