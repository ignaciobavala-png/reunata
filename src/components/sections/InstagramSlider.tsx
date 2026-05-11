'use client'

import useEmblaCarousel from 'embla-carousel-react'
import { FadeIn } from '@/components/ui/FadeIn'
import Image from 'next/image'

interface Post {
  id: number
  thumbnail_url: string | null
  caption: string | null
  username: string | null
  permalink: string | null
  url_instagram: string
}

export function InstagramSlider({ posts }: { posts: Post[] }) {
  const [emblaRef] = useEmblaCarousel({
    loop: false,
    dragFree: true,
    containScroll: 'trimSnaps',
    align: 'start',
  })

  if (posts.length === 0) return null

  return (
    <section className="py-16 md:py-24 overflow-hidden">
      <FadeIn className="px-6 md:px-10 mb-10 flex items-center gap-4">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5" style={{ color: 'var(--color-granito)' }}>
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" />
        </svg>
        <div>
          <span className="text-sm tracking-[0.2em] uppercase font-semibold" style={{ color: 'var(--color-granito)' }}>
            Comunidad Reunata
          </span>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-acero-oscuro)' }}>
            Seguinos en @reunata.ar
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div ref={emblaRef} className="overflow-hidden cursor-grab active:cursor-grabbing">
          <div className="flex gap-2 pl-6 md:pl-10 pr-6">
            {posts.map((post) => (
              <a
                key={post.id}
                href={post.permalink ?? post.url_instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-none w-[260px] md:w-[300px] aspect-square relative overflow-hidden group"
                style={{ border: '1px solid var(--border)' }}
              >
                {post.thumbnail_url ? (
                  <Image
                    src={post.thumbnail_url}
                    alt={post.caption ?? ''}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="300px"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <span className="text-[9px] tracking-widest text-gray-400 uppercase">
                      {post.username ?? 'Instagram'}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    {post.caption && (
                      <p className="text-white text-xs leading-relaxed line-clamp-2">{post.caption}</p>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.2} className="px-6 md:px-10 mt-6">
        <a
          href="https://www.instagram.com/reunata.ar/"
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
