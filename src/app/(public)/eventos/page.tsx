import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Próximos eventos — Reunata' }

export default function EventosPage() {
  return (
    <div className="px-6 md:px-16 max-w-5xl mx-auto" style={{ background: 'var(--color-acero-claro)' }}>
      <section className="pt-36 pb-24">
        <p className="text-xs tracking-widest uppercase mb-5" style={{ color: 'var(--color-acero-oscuro)' }}>
          Eventos
        </p>
        <h1 className="text-4xl md:text-6xl leading-tight mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
          Agenda de eventos.
        </h1>
        <p className="text-base md:text-lg max-w-xl leading-relaxed mb-4" style={{ color: 'var(--color-granito-oscuro)' }}>
          Muy pronto vas a poder ver aquí nuestra participación en ferias, showrooms y presentaciones de temporada.
        </p>
        <p className="text-base max-w-xl leading-relaxed mb-10" style={{ color: 'var(--color-acero-oscuro)' }}>
          Si querés saber de nuestros próximos eventos antes de que se publiquen, escribinos.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/contacto"
            className="px-6 py-3 text-sm font-medium rounded-full transition-colors duration-200"
            style={{ background: 'var(--foreground)', color: 'var(--color-acero-claro)' }}
          >
            Contactarnos
          </Link>
          <Link
            href="/"
            className="px-6 py-3 text-sm font-medium rounded-full border transition-colors duration-200"
            style={{ borderColor: 'var(--color-granito-claro)', color: 'var(--color-granito-oscuro)' }}
          >
            Volver al inicio
          </Link>
        </div>
      </section>
    </div>
  )
}
