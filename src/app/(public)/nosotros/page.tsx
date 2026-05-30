export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ImageIcon } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Nosotros',
  description: 'Conocé la historia de Reunata, empresa argentina especializada en la importación y distribución de mates, termos y accesorios.',
  alternates: { canonical: '/nosotros' },
}
import { createServiceClient } from '@/lib/supabase/server'

const categorias = [
  { label: 'Mates',                   href: '/tienda/mates' },
  { label: 'Térmicos de acero',       href: '/tienda/termicos-de-acero' },
  { label: 'Bombillas y sorbetes',    href: '/tienda/bombillas-y-sorbetes' },
  { label: 'Materas y mochilas',      href: '/tienda/materas-y-mochilas' },
  { label: 'Accesorios para el mate', href: '/tienda/accesorios' },
  { label: 'Para la cocina',          href: '/tienda/cocina' },
  { label: 'Merchandising',           href: '/tienda/merchandising' },
  { label: 'Gift Card',               href: '/tienda/gift-card' },
]

function FotoLateral({ path, supabaseUrl }: { path: string | null; supabaseUrl: string }) {
  if (!path) return (
    <div className="hidden lg:flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed min-h-[400px] px-6 py-12 text-center"
      style={{ borderColor: 'var(--color-granito-claro)', background: 'var(--color-acero-brillo)', color: 'var(--color-acero-oscuro)' }}
    >
      <ImageIcon size={40} strokeWidth={1} />
    </div>
  )
  return (
    <div className="hidden lg:block relative rounded-2xl overflow-hidden min-h-[400px]">
      <Image
        src={`${supabaseUrl}/storage/v1/object/public/multimedia/${path}`}
        alt=""
        fill
        className="object-cover"
        sizes="280px"
      />
    </div>
  )
}

export default async function NosotrosPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabase = createServiceClient()
  const { data: rows } = await supabase
    .from('configuracion')
    .select('clave, valor')
    .in('clave', [
      'nosotros_hero_titulo', 'nosotros_hero_texto',
      'nosotros_valor_1_titulo', 'nosotros_valor_1_texto',
      'nosotros_valor_2_titulo', 'nosotros_valor_2_texto',
      'nosotros_valor_3_titulo', 'nosotros_valor_3_texto',
      'nosotros_foto_izquierda', 'nosotros_foto_derecha',
    ])

  const cfg: Record<string, string> = {}
  for (const r of rows ?? []) cfg[r.clave] = r.valor

  const heroTitulo = cfg['nosotros_hero_titulo'] || 'El mate como cultura, el acero como filosofía.'
  const heroTexto  = cfg['nosotros_hero_texto']  || 'Reunata nació de una convicción simple: el ritual del mate merece productos a la altura. Importamos y distribuimos equipamiento de calidad real — sin folklore, sin excesos. Diseño que dura, materiales que importan.'

  const valores = [
    { numero: '01', titulo: cfg['nosotros_valor_1_titulo'] || 'Selección rigurosa',  texto: cfg['nosotros_valor_1_texto'] || '' },
    { numero: '02', titulo: cfg['nosotros_valor_2_titulo'] || 'Mayorista de verdad', texto: cfg['nosotros_valor_2_texto'] || '' },
    { numero: '03', titulo: cfg['nosotros_valor_3_titulo'] || 'Relación directa',    texto: cfg['nosotros_valor_3_texto'] || '' },
  ]

  const fotoIzquierda = cfg['nosotros_foto_izquierda'] || null
  const fotoDerecha   = cfg['nosotros_foto_derecha']   || null

  return (
    <main>
      <div className="px-6 md:px-16 max-w-7xl mx-auto">

        {/* Hero */}
        <section className="pt-28 pb-16 border-b-2 border-[var(--color-granito-claro)]">
          <p className="text-xs tracking-widest uppercase mb-4 text-[var(--color-granito-oscuro)]">
            Nosotros
          </p>
          <h1
            className="text-4xl md:text-6xl leading-tight mb-6 text-[var(--color-granito-oscuro)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {heroTitulo}
          </h1>
          <p className="text-base max-w-2xl leading-relaxed text-[var(--color-granito-oscuro)]">
            {heroTexto}
          </p>
        </section>

        {/* Contenido con fotos laterales */}
        <section className="py-14">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-8 lg:gap-12 items-start">
            <FotoLateral path={fotoIzquierda} supabaseUrl={supabaseUrl} />

            <div className="flex flex-col gap-0">
              {/* Cómo trabajamos */}
              <div className="pb-14 border-b-2 border-[var(--color-granito-claro)]">
                <p className="text-xs tracking-widest uppercase mb-8 text-[var(--color-granito-oscuro)]">
                  Cómo trabajamos
                </p>
                <div className="flex flex-col gap-3">
                  {valores.map((v) => (
                    <div
                      key={v.numero}
                      className="flex flex-col gap-3 p-6 border-2 border-[var(--color-granito-claro)] bg-white rounded-xl hover:border-[var(--color-acero-oscuro)] transition-colors duration-200"
                    >
                      <span className="text-xs font-mono text-[var(--color-acero-oscuro)]">{v.numero}</span>
                      <h3 className="text-base font-semibold text-[var(--color-granito-oscuro)]">{v.titulo}</h3>
                      {v.texto && <p className="text-sm leading-relaxed text-[var(--color-granito-oscuro)]">{v.texto}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Lo que distribuimos */}
              <div className="py-14 border-b-2 border-[var(--color-granito-claro)]">
                <p className="text-xs tracking-widest uppercase mb-8 text-[var(--color-granito-oscuro)]">
                  Lo que distribuimos
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {categorias.map((cat) => (
                    <Link
                      key={cat.href}
                      href={cat.href}
                      className="group flex items-center justify-between px-4 py-4 border-2 border-[var(--color-granito-claro)] bg-white rounded-xl text-sm text-[var(--color-granito-oscuro)] hover:border-[var(--color-acero-oscuro)] hover:bg-white transition-all duration-200"
                    >
                      <span>{cat.label}</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">→</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="pt-14 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                <div className="flex-1">
                  <p className="text-lg font-semibold text-[var(--color-granito-oscuro)] mb-1">¿Querés ser parte?</p>
                  <p className="text-sm text-[var(--color-granito-oscuro)] leading-relaxed">
                    Trabajamos con distribuidores, locales y revendedores de todo el país.
                  </p>
                </div>
                <div className="flex gap-3 flex-shrink-0">
                  <Link
                    href="/trabaja-con-nosotros"
                    className="px-6 py-3 text-sm bg-[var(--color-granito-oscuro)] text-white rounded-full hover:bg-[var(--color-granito)] transition-colors duration-200 font-medium"
                  >
                    Trabajá con nosotros
                  </Link>
                  <Link
                    href="/contacto"
                    className="px-6 py-3 text-sm border-2 border-[var(--color-granito-claro)] bg-white text-[var(--color-granito-oscuro)] rounded-full hover:border-[var(--color-acero-oscuro)] transition-colors duration-200"
                  >
                    Contacto
                  </Link>
                </div>
              </div>
            </div>

            <FotoLateral path={fotoDerecha} supabaseUrl={supabaseUrl} />
          </div>
        </section>

      </div>
    </main>
  )
}
