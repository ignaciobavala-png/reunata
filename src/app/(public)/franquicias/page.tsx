import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Franquicias — Reunata' }

export default function FranquiciasPage() {
  return (
    <div className="px-6 md:px-16 max-w-5xl mx-auto" style={{ background: 'var(--color-acero-claro)' }}>
      <section className="pt-36 pb-24">
        <p className="text-xs tracking-widest uppercase mb-5" style={{ color: 'var(--color-acero-oscuro)' }}>
          Franquicias
        </p>
        <h1 className="text-4xl md:text-6xl leading-tight mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
          Crecé con Reunata.
        </h1>
        <p className="text-base md:text-lg max-w-xl leading-relaxed mb-4" style={{ color: 'var(--color-granito-oscuro)' }}>
          Estamos desarrollando nuestro programa de franquicias y puntos de venta propios. Si te interesa ser parte de la red Reunata, queremos conocerte.
        </p>
        <p className="text-base max-w-xl leading-relaxed mb-10" style={{ color: 'var(--color-acero-oscuro)' }}>
          Escribinos con tu propuesta y un representante del equipo comercial se va a poner en contacto.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/contacto"
            className="px-6 py-3 text-sm font-medium rounded-full transition-colors duration-200"
            style={{ background: 'var(--foreground)', color: 'var(--color-acero-claro)' }}
          >
            Escribirnos
          </Link>
          <Link
            href="/registro?tab=mayorista"
            className="px-6 py-3 text-sm font-medium rounded-full border transition-colors duration-200"
            style={{ borderColor: 'var(--color-granito-claro)', color: 'var(--color-granito-oscuro)' }}
          >
            Registro mayorista
          </Link>
        </div>
      </section>
    </div>
  )
}
