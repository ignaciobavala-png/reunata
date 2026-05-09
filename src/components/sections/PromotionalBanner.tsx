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

  const img = (
    <Image
      src={imgUrl}
      alt={banner.titulo ?? 'Banner promocional'}
      width={1200}
      height={400}
      className="w-full h-auto object-cover"
    />
  )

  return (
    <section className="border-y-2" style={{ borderColor: 'var(--color-granito-claro)' }}>
      {banner.linkUrl ? (
        <Link href={banner.linkUrl} target={banner.linkUrl.startsWith('http') ? '_blank' : undefined}>
          {img}
        </Link>
      ) : img}
    </section>
  )
}
