import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Políticas de devolución — Reunata' }

export default function PoliticasPage() {
  return (
    <div className="px-6 md:px-16 max-w-5xl mx-auto" style={{ background: 'var(--color-acero-claro)' }}>
      <section className="pt-36 pb-24">
        <p className="text-xs tracking-widest uppercase mb-5" style={{ color: 'var(--color-acero-oscuro)' }}>
          Legal
        </p>
        <h1 className="text-4xl md:text-6xl leading-tight mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
          Políticas de devolución.
        </h1>
        <p className="text-base md:text-lg max-w-xl leading-relaxed mb-4" style={{ color: 'var(--color-granito-oscuro)' }}>
          Las políticas de devolución e intercambio están en proceso de redacción. Próximamente vas a encontrar toda la información aquí.
        </p>
        <p className="text-base max-w-xl leading-relaxed mb-10" style={{ color: 'var(--color-acero-oscuro)' }}>
          Para gestionar una devolución o reclamo en este momento, contactanos por WhatsApp o por el formulario de contacto.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://wa.me/5491132720974"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 text-sm font-medium rounded-full transition-colors duration-200"
            style={{ background: 'var(--foreground)', color: 'var(--color-acero-claro)' }}
          >
            WhatsApp
          </a>
          <Link
            href="/contacto"
            className="px-6 py-3 text-sm font-medium rounded-full border transition-colors duration-200"
            style={{ borderColor: 'var(--color-granito-claro)', color: 'var(--color-granito-oscuro)' }}
          >
            Formulario de contacto
          </Link>
        </div>
      </section>
    </div>
  )
}
