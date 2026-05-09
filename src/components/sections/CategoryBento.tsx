import { createServiceClient } from '@/lib/supabase/server'
import { FadeIn } from '@/components/ui/FadeIn'
import Link from 'next/link'
import Image from 'next/image'
import { supabaseImg } from '@/lib/images'

const SPANS = [
  'col-span-12 md:col-span-7 md:row-span-2',
  'col-span-12 md:col-span-5',
  'col-span-6 md:col-span-3',
  'col-span-6 md:col-span-2',
]

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function pickRandom<T>(arr: T[]): T | null {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null
}

export async function CategoryBento() {
  const supabase = createServiceClient()

  const { data: categorias } = await supabase
    .from('categorias_home')
    .select('id, nombre, descripcion, href, gradient, texto_claro, categoria_keys')
    .eq('activo', true)
    .order('orden')

  if (!categorias?.length) return null

  const allKeys = [...new Set(categorias.flatMap(c => c.categoria_keys ?? []))]

  // Obtener IDs de productos en el canal público
  const { data: canalPublico } = await supabase
    .from('canales')
    .select('id')
    .eq('slug', 'publico')
    .single()

  const { data: publicoAsignaciones } = canalPublico
    ? await supabase.from('producto_canales').select('producto_id').eq('canal_id', canalPublico.id)
    : { data: [] }

  const idsPublicos = new Set((publicoAsignaciones ?? []).map(a => a.producto_id))

  const { data: productos } = allKeys.length > 0
    ? await supabase
        .from('productos')
        .select('id, categoria, producto_fotos(url)')
        .in('categoria', allKeys)
        .in('id', [...idsPublicos])
    : { data: [] }

  // Agrupar fotos por macrocategoría (solo productos en canal público)
  const fotosPorCat: Record<number, string[]> = {}
  for (const cat of categorias) {
    const keys: string[] = cat.categoria_keys ?? []
    fotosPorCat[cat.id] = (productos ?? [])
      .filter(p => keys.includes(p.categoria ?? ''))
      .flatMap(p => (p.producto_fotos as { url: string }[] ?? []).map(f => f.url))
  }

  return (
    <section className="px-4 md:px-6 py-16 md:py-24">
      <FadeIn className="mb-10 flex items-end justify-between px-2">
        <h2
          className="text-3xl md:text-4xl text-[var(--foreground)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
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
          {categorias.slice(0, 4).map((cat, i) => {
            const span = SPANS[i] ?? 'col-span-6'
            const foto = pickRandom(fotosPorCat[cat.id] ?? [])

            return (
              <Link
                key={cat.id}
                href={cat.href ?? '/tienda'}
                className={`group relative overflow-hidden ${span} flex flex-col justify-end p-6 md:p-8`}
                style={{ border: '1px solid var(--border)' }}
              >
                {/* Fondo: foto real o gradiente como fallback */}
                {foto ? (
                  <Image
                    src={supabaseImg(SUPABASE_URL, foto, 600)}
                    alt={cat.nombre}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient}`} />
                )}

                {/* Overlay oscuro para legibilidad */}
                <div className="absolute inset-0 bg-black/35 group-hover:bg-black/45 transition-colors duration-500" />

                {/* Textura */}
                <div
                  className="absolute inset-0 opacity-20 mix-blend-overlay"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
                  }}
                />

                {/* Número */}
                <span className="absolute top-6 right-6 text-[10px] tracking-[0.3em] text-white/40">
                  0{i + 1}
                </span>

                {/* Texto */}
                <div className="relative z-10">
                  <p className="text-[10px] tracking-widest uppercase mb-2 text-white/60">
                    {cat.descripcion}
                  </p>
                  <h3
                    className="text-2xl md:text-3xl text-white"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {cat.nombre}
                  </h3>
                </div>

                {/* Línea animada */}
                <div className="absolute bottom-0 left-0 h-px w-0 group-hover:w-full transition-all duration-500 bg-white/30" />
              </Link>
            )
          })}
        </div>
      </FadeIn>
    </section>
  )
}
