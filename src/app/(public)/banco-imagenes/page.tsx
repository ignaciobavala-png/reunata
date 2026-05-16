import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Banco de imágenes — Reunata' }

export default function BancoImagenesPage() {
  return (
    <div className="px-6 md:px-16 max-w-5xl mx-auto" style={{ background: 'var(--color-acero-claro)' }}>
      <section className="pt-36 pb-24">
        <p className="text-xs tracking-widest uppercase mb-5" style={{ color: 'var(--color-acero-oscuro)' }}>
          Banco de imágenes
        </p>
        <h1 className="text-4xl md:text-6xl leading-tight mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
          Imágenes para revendedores.
        </h1>
        <p className="text-base md:text-lg max-w-xl leading-relaxed mb-4" style={{ color: 'var(--color-granito-oscuro)' }}>
          Estamos organizando el banco de imágenes de alta resolución para distribuidores, locales y revendedores de Reunata.
        </p>
        <p className="text-base max-w-xl leading-relaxed mb-10" style={{ color: 'var(--color-acero-oscuro)' }}>
          Si necesitás imágenes de productos para tu catálogo o redes sociales, escribinos y te las enviamos.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://wa.me/5491132720974"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 text-sm font-medium rounded-full transition-colors duration-200"
            style={{ background: 'var(--foreground)', color: 'var(--color-acero-claro)' }}
          >
            Pedir imágenes por WhatsApp
          </a>
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
