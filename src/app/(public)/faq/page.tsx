import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Preguntas frecuentes — Reunata' }

export default function FaqPage() {
  return (
    <div className="px-6 md:px-16 max-w-5xl mx-auto" style={{ background: 'var(--color-acero-claro)' }}>
      <section className="pt-36 pb-24">
        <p className="text-xs tracking-widest uppercase mb-5" style={{ color: 'var(--color-acero-oscuro)' }}>
          FAQ
        </p>
        <h1 className="text-4xl md:text-6xl leading-tight mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
          Preguntas frecuentes.
        </h1>
        <p className="text-base md:text-lg max-w-xl leading-relaxed mb-4" style={{ color: 'var(--color-granito-oscuro)' }}>
          Estamos preparando las respuestas a las preguntas más habituales sobre pedidos, envíos, condiciones mayoristas y productos.
        </p>
        <p className="text-base max-w-xl leading-relaxed mb-10" style={{ color: 'var(--color-acero-oscuro)' }}>
          Mientras tanto, cualquier duda la resolvemos directo. No hay chatbot: hay personas.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://wa.me/5491132720974"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 text-sm font-medium rounded-full transition-colors duration-200"
            style={{ background: 'var(--foreground)', color: 'var(--color-acero-claro)' }}
          >
            Consultar por WhatsApp
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
