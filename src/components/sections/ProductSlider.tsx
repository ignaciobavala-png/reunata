'use client'

import useEmblaCarousel from 'embla-carousel-react'
import { FadeIn } from '@/components/ui/FadeIn'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabaseImg } from '@/lib/images'
import { formatPrecio } from '@/lib/utils'

export interface FotoDestacada {
  id: number
  url: string
  producto_id: number
  titulo: string
  codigo_interno: string
  precio: number | null
  moneda?: string | null
  iva?: number | null
  supabaseUrl: string
}

export function ProductSlider({ fotos, esMayorista = false, precioIncluyeIva }: { fotos: FotoDestacada[]; esMayorista?: boolean; precioIncluyeIva?: boolean }) {
  // Sin prop → comportamiento viejo (minorista con IVA, mayorista neto).
  const incluyeIva = precioIncluyeIva ?? !esMayorista
  const [emblaRef] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    loop: false,
  })
  const router = useRouter()

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
          href="/tienda/mas-vendidos"
          className="text-[10px] tracking-widest uppercase text-[var(--color-granito-claro)] hover:text-[var(--foreground)] transition-colors"
        >
          Ver todo
        </Link>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex gap-3 pl-6 md:pl-10 pr-6">
            {fotos.map((foto) => {
              const imgUrl = supabaseImg(foto.supabaseUrl, foto.url, 240, { height: 320 })
              return (
                <button
                  key={foto.id}
                  className="group flex-none w-[200px] md:w-[240px] text-left cursor-pointer"
                  onClick={() => router.push(`/tienda/p/${foto.producto_id}`)}
                >
                  <div
                    className="w-full aspect-[3/4] mb-4 relative overflow-hidden transition-opacity duration-200 group-hover:opacity-90"
                    style={{ border: '1px solid var(--border)' }}
                  >
                    <Image
                      src={imgUrl}
                      alt={foto.titulo}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 200px, 240px"
                    />
                    {/* Cinta diagonal */}
                    <div
                      className="absolute top-[28px] left-[-42px] w-[160px] flex items-center justify-center py-1.5 rotate-[-45deg]"
                      style={{ background: 'linear-gradient(90deg, #3A5248, #5E8070, #3A5248)', boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }}
                    >
                      <span className="text-[10px] tracking-widest uppercase font-semibold" style={{ color: '#ECEEF1', letterSpacing: '0.15em' }}>
                        Más elegido
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] tracking-widest uppercase text-[var(--foreground)] mb-1">
                    {foto.titulo}
                  </p>
                  <p className="text-[10px] tracking-wider text-[var(--color-acero-oscuro)]">
                    {foto.codigo_interno}
                  </p>
                  {foto.precio != null && (() => {
                    // incluyeIva (lista): lista5 ya trae IVA → neto=precio/f, conIva=precio.
                    // esMayorista (presentación): neto + "IVA incluido" vs. final + "sin impuestos".
                    const f = 1 + (foto.iva ?? 21) / 100
                    const neto = incluyeIva ? Math.round(foto.precio / f) : foto.precio
                    const conIva = incluyeIva ? foto.precio : Math.round(foto.precio * f)
                    return esMayorista ? (
                      <>
                        <p className="text-sm font-medium mt-1" style={{ color: 'var(--foreground)' }}>
                          {formatPrecio(neto, foto.moneda)}
                        </p>
                        <p className="text-[11px]" style={{ color: 'var(--color-acero-oscuro)' }}>
                          IVA incluido: {formatPrecio(conIva, foto.moneda)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-bold mt-1" style={{ color: 'var(--foreground)' }}>
                          {formatPrecio(conIva, foto.moneda)}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--color-acero-oscuro)' }}>
                          Precio sin impuestos nacionales: {formatPrecio(neto, foto.moneda)}
                        </p>
                      </>
                    )
                  })()}
                </button>
              )
            })}
          </div>
        </div>
      </FadeIn>
    </section>
  )
}
