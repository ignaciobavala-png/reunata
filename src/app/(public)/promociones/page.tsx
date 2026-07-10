import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Promociones — Reunata' }

export default function PromocionesPage() {
  return (
    <div style={{ background: 'var(--color-granito-oscuro)' }}>
      <div className="px-6 md:px-16 max-w-5xl mx-auto">
        <section className="pt-36 pb-24">
          <h1 className="text-4xl md:text-6xl leading-tight mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-acero-brillo)' }}>
            Promociones especiales.
          </h1>
          <p className="text-base md:text-lg max-w-xl leading-relaxed mb-4" style={{ color: 'var(--color-acero)' }}>
            Próximamente vas a encontrar aquí todas las promociones, descuentos por volumen y ofertas de temporada de Reunata.
          </p>
          <p className="text-base max-w-xl leading-relaxed mb-10" style={{ color: 'var(--color-acero-oscuro)' }}>
            Mientras tanto, podés explorar el catálogo completo o escribirnos por WhatsApp para conocer las promociones vigentes.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/tienda"
              className="px-6 py-3 text-sm font-medium rounded-full transition-colors duration-200"
              style={{ background: 'var(--color-acero-brillo)', color: 'var(--color-granito-oscuro)' }}
            >
              Ver catálogo
            </Link>
            <Link
              href="/registro?tab=mayorista"
              className="px-6 py-3 text-sm font-medium rounded-full border transition-colors duration-200"
              style={{ borderColor: 'var(--color-granito-claro)', color: 'var(--color-acero)' }}
            >
              Acceso mayorista
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
