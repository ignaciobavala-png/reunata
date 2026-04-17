'use client'

import useEmblaCarousel from 'embla-carousel-react'
import { FadeIn } from '@/components/ui/FadeIn'
import { Camera } from 'lucide-react'

const posts = [
  { id: 1, gradient: 'from-[#1A1D21] to-[#2E3135]', caption: '@reunata_ar' },
  { id: 2, gradient: 'from-[#A8B0BB] to-[#D4D9E0]', caption: '@reunata_ar' },
  { id: 3, gradient: 'from-[#2E3135] to-[#5A5F66]', caption: '@reunata_ar' },
  { id: 4, gradient: 'from-[#D4D9E0] to-[#ECEEF1]', caption: '@reunata_ar' },
  { id: 5, gradient: 'from-[#111316] to-[#3A3D42]', caption: '@reunata_ar' },
  { id: 6, gradient: 'from-[#6E7882] to-[#A8B0BB]', caption: '@reunata_ar' },
  { id: 7, gradient: 'from-[#3A3D42] to-[#2E3135]', caption: '@reunata_ar' },
]

export function InstagramSlider() {
  const [emblaRef] = useEmblaCarousel({
    loop: false,
    dragFree: true,
    containScroll: 'trimSnaps',
    align: 'start',
  })

  return (
    <section className="py-16 md:py-24 overflow-hidden">
      <FadeIn className="px-6 md:px-10 mb-10 flex items-center gap-3">
        <Camera size={14} strokeWidth={1.5} className="text-[var(--color-acero-oscuro)]" />
        <span className="text-[10px] tracking-[0.35em] uppercase text-[var(--color-granito-claro)]">
          Comunidad Reunata
        </span>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div ref={emblaRef} className="overflow-hidden cursor-grab active:cursor-grabbing">
          <div className="flex gap-2 pl-6 md:pl-10 pr-6">
            {posts.map((post) => (
              <div
                key={post.id}
                className={`flex-none w-[260px] md:w-[300px] aspect-square bg-gradient-to-br ${post.gradient} flex items-end p-4`}
                style={{ border: '1px solid var(--border)' }}
              >
                <span className="text-[9px] tracking-widest text-white/50 uppercase">
                  {post.caption}
                </span>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.2} className="px-6 md:px-10 mt-6">
        <a
          href="https://instagram.com/reunata_ar"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] tracking-widest uppercase text-[var(--color-granito-claro)] hover:text-[var(--foreground)] transition-colors"
        >
          Seguinos en Instagram →
        </a>
      </FadeIn>
    </section>
  )
}
