'use client'

import { createClient } from '@/lib/supabase/client'
import { FadeIn } from '@/components/ui/FadeIn'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'

const supabase = createClient()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

interface CategoriaHome {
  id: number
  nombre: string
  descripcion: string
  href: string
  gradient: string
  categoria_keys: string[]
}

type Foto = { url: string }

export function CategoryGallery() {
  const [categorias, setCategorias] = useState<CategoriaHome[]>([])
  const [fotosPorCat, setFotosPorCat] = useState<Record<number, string[]>>({})

  useEffect(() => {
    async function loadData() {
      const { data: cats } = await supabase
        .from('categorias_home')
        .select('id, nombre, descripcion, href, gradient, categoria_keys')
        .eq('activo', true)
        .order('orden')

      if (!cats?.length) return

      setCategorias(cats)

      const allKeys = [...new Set(cats.flatMap(c => c.categoria_keys ?? []))]

      const { data: canalPublico } = await supabase
        .from('canales')
        .select('id')
        .eq('slug', 'publico')
        .single()

      const { data: publicaAsignaciones } = canalPublico
        ? await supabase.from('producto_canales').select('producto_id').eq('canal_id', canalPublico.id)
        : { data: [] }

      const idsPublicos = new Set((publicaAsignaciones ?? []).map(a => a.producto_id))

      const { data: productos } = allKeys.length > 0
        ? await supabase
            .from('productos')
            .select('id, categoria, producto_fotos(url)')
            .in('categoria', allKeys)
            .in('id', [...idsPublicos])
        : { data: [] }

      const fotosMap: Record<number, string[]> = {}
      for (const cat of cats) {
        const keys: string[] = cat.categoria_keys ?? []
        fotosMap[cat.id] = (productos ?? [])
          .filter(p => keys.includes(p.categoria ?? ''))
          .flatMap(p => (p.producto_fotos as Foto[] ?? []).map(f => f.url))
          .slice(0, 4)
      }

      setFotosPorCat(fotosMap)
    }

    loadData()
  }, [])

  if (categorias.length === 0) return null

  return (
    <section className="px-4 md:px-6 pt-6 md:pt-10 pb-16 md:pb-24">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {categorias.map((cat) => {
            const fotos = fotosPorCat[cat.id] ?? []
            const fotoPrincipal = fotos[0]

            return (
              <Link
                key={cat.id}
                href={cat.href ?? '/tienda'}
                className="group relative aspect-[3/4] overflow-hidden block"
              >
                {fotoPrincipal ? (
                  <Image
                    src={`${SUPABASE_URL}/storage/v1/object/public/multimedia/${fotoPrincipal}`}
                    alt={cat.nombre}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, 25vw"
                    unoptimized
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient || 'from-[#1A1D21] to-[#2E3135]'}`} />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                {fotos.length > 1 && (
                  <div className="absolute bottom-16 left-4 right-4 flex gap-1">
                    {fotos.slice(1, 4).map((foto, idx) => (
                      <div key={idx} className="w-8 h-10 relative overflow-hidden rounded-sm">
                        <Image
                          src={`${SUPABASE_URL}/storage/v1/object/public/multimedia/${foto}`}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="32px"
                          unoptimized
                        />
                      </div>
                    ))}
                    {fotos.length > 4 && (
                      <div className="w-8 h-10 flex items-center justify-center bg-black/50 rounded-sm">
                        <span className="text-[10px] text-white">+{fotos.length - 4}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-[9px] tracking-[0.25em] uppercase text-white/60 mb-1">
                    {cat.descripcion}
                  </p>
                  <h3 className="text-base md:text-lg uppercase text-white font-light">
                    {cat.nombre}
                  </h3>
                  <div className="mt-1 h-px w-8 bg-white/40 group-hover:w-full transition-all duration-300" />
                </div>
              </Link>
            )
          })}
        </div>
      </FadeIn>
    </section>
  )
}