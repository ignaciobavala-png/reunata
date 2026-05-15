import { ImageIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { supabaseImg } from '@/lib/images'

interface BannerData {
  url: string
  titulo: string | null
  linkUrl: string | null
  supabaseUrl: string
}

export function PromotionalBanner({ banner }: { banner: BannerData | null }) {
  if (!banner) {
    return (
      <section
        className="flex flex-col items-center justify-center gap-4 py-16 md:py-20 border-y-2"
        style={{
          borderColor: 'var(--color-granito-claro)',
          background: 'var(--color-acero-brillo)',
          color: 'var(--color-acero-oscuro)',
        }}
      >
        <ImageIcon size={40} strokeWidth={1} />
        <p className="text-sm font-semibold">Banner promocional</p>
        <p className="text-xs opacity-70">Próximamente</p>
      </section>
    )
  }

  const imgUrl = supabaseImg(banner.supabaseUrl, banner.url, 1200)

  const content = (
    <div className="relative h-36 sm:h-44 md:h-52 w-full overflow-hidden">
      <Image
        src={imgUrl}
        alt={banner.titulo ?? 'Banner promocional'}
        fill
        className="object-cover object-center"
        sizes="100vw"
      />
      {banner.titulo && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className="text-xl md:text-3xl lg:text-4xl font-semibold text-white drop-shadow-lg text-center px-6"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {banner.titulo}
          </span>
        </div>
      )}
    </div>
  )

  return (
    <section className="border-y-2" style={{ borderColor: 'var(--color-granito-claro)' }}>
      {banner.linkUrl ? (
        <Link href={banner.linkUrl} target={banner.linkUrl.startsWith('http') ? '_blank' : undefined}>
          {content}
        </Link>
      ) : content}
    </section>
  )
}
