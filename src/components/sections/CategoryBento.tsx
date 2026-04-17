import { FadeIn } from '@/components/ui/FadeIn'
import Link from 'next/link'

const categories = [
  {
    id: 1,
    name: 'Mates',
    description: 'Artesanales e importados',
    href: '/tienda/mates',
    span: 'col-span-12 md:col-span-7 md:row-span-2',
    gradient: 'from-[#111316] via-[#2E3135] to-[#1A1D21]',
    textLight: true,
    tall: true,
  },
  {
    id: 2,
    name: 'Termos',
    description: 'Acero inoxidable de doble pared',
    href: '/tienda/termos',
    span: 'col-span-12 md:col-span-5',
    gradient: 'from-[#A8B0BB] via-[#D4D9E0] to-[#ECEEF1]',
    textLight: false,
  },
  {
    id: 3,
    name: 'Bombillas',
    description: 'Filtrado perfecto',
    href: '/tienda/bombillas',
    span: 'col-span-6 md:col-span-3',
    gradient: 'from-[#3A3D42] to-[#6E7882]',
    textLight: true,
  },
  {
    id: 4,
    name: 'Yerbas',
    description: 'Selección premium',
    href: '/tienda/yerbas',
    span: 'col-span-6 md:col-span-2',
    gradient: 'from-[#6E7882] to-[#A8B0BB]',
    textLight: false,
  },
]

export function CategoryBento() {
  return (
    <section className="px-4 md:px-6 py-16 md:py-24">
      <FadeIn className="mb-10 flex items-end justify-between px-2">
        <h2 className="text-3xl md:text-4xl text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>
          Categorías
        </h2>
        <Link
          href="/tienda"
          className="text-[10px] tracking-widest uppercase text-[var(--color-granito-claro)] hover:text-[var(--foreground)] transition-colors"
        >
          Ver todo
        </Link>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="grid grid-cols-12 gap-2 md:gap-3 grid-rows-[240px_240px] md:grid-rows-[320px_320px]">
          {categories.map((cat, i) => (
            <Link
              key={cat.id}
              href={cat.href}
              className={`group relative overflow-hidden ${cat.span} bg-gradient-to-br ${cat.gradient} flex flex-col justify-end p-6 md:p-8`}
              style={{ border: '1px solid var(--border)' }}
            >
              {/* Hover zoom overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/0 group-hover:from-white/5 group-hover:to-white/0 transition-all duration-700" />

              {/* Simulated texture */}
              <div
                className="absolute inset-0 opacity-20 mix-blend-overlay"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
                }}
              />

              {/* Number */}
              <span
                className={`absolute top-6 right-6 text-[10px] tracking-[0.3em] ${cat.textLight ? 'text-white/40' : 'text-black/30'}`}
              >
                0{i + 1}
              </span>

              {/* Text */}
              <div className="relative z-10">
                <p className={`text-[10px] tracking-widest uppercase mb-2 ${cat.textLight ? 'text-white/50' : 'text-black/40'}`}>
                  {cat.description}
                </p>
                <h3
                  className={`text-2xl md:text-3xl ${cat.textLight ? 'text-white' : 'text-[var(--foreground)]'}`}
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {cat.name}
                </h3>
              </div>

              {/* Bottom line animation */}
              <div className={`absolute bottom-0 left-0 h-px w-0 group-hover:w-full transition-all duration-500 ${cat.textLight ? 'bg-white/30' : 'bg-black/20'}`} />
            </Link>
          ))}
        </div>
      </FadeIn>
    </section>
  )
}
