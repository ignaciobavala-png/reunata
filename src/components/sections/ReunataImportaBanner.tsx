import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

/**
 * Banner horizontal de REUNATA importa en la home, debajo de las categorías.
 *
 * Lo ve todo el mundo (decisión de Gastón, 07/10/2026). El permiso no se mira
 * acá sino en /tienda/containers: ahí se muestran las condiciones y, según la
 * cuenta, los productos o el pedido de acceso.
 *
 * La foto es una franja ~4:1 con el logo del barco al centro. En desktop va
 * entera; en mobile se recorta a 2:1, que todavía deja el logo completo.
 */
export function ReunataImportaBanner() {
  return (
    <section className="border-y-2" style={{ borderColor: 'var(--color-granito-claro)' }}>
      <Link href="/tienda/containers" className="group block">
        <div className="relative aspect-[2/1] sm:aspect-[3/1] md:aspect-[1600/396] w-full overflow-hidden">
          <Image
            src="/fotos/banner-reunata-importa.webp"
            alt="Barco portacontenedores con el logo de Reunata"
            fill
            className="object-cover object-center"
            sizes="100vw"
          />
        </div>
        <div
          className="flex items-center justify-between gap-4 px-6 md:px-16 py-4"
          style={{ background: 'var(--color-granito-oscuro)', color: 'white' }}
        >
          <p className="text-xs md:text-sm">
            <span className="tracking-widest uppercase font-semibold">REUNATA importa</span>
            <span className="hidden sm:inline opacity-80"> · Comprá antes de que llegue el barco, a mejor precio.</span>
          </p>
          <span className="flex items-center gap-1.5 text-xs tracking-widest uppercase whitespace-nowrap">
            Conocé cómo funciona
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </section>
  )
}
