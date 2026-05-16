import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Catálogo — Reunata' }

export default function CatalogoPage() {
  return (
    <div className="px-6 md:px-16 max-w-5xl mx-auto" style={{ background: 'var(--color-acero-claro)' }}>
      <section className="pt-36 pb-24">
        <p className="text-xs tracking-widest uppercase mb-5" style={{ color: 'var(--color-acero-oscuro)' }}>
          Catálogo
        </p>
        <h1 className="text-4xl md:text-6xl leading-tight mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
          Catálogo descargable.
        </h1>
        <p className="text-base md:text-lg max-w-xl leading-relaxed mb-4" style={{ color: 'var(--color-granito-oscuro)' }}>
          Estamos preparando el catálogo digital para que puedas descargarlo y compartirlo con tus clientes.
        </p>
        <p className="text-base max-w-xl leading-relaxed mb-10" style={{ color: 'var(--color-acero-oscuro)' }}>
          Mientras tanto, explorá toda la colección disponible en la tienda online.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/tienda"
            className="px-6 py-3 text-sm font-medium rounded-full transition-colors duration-200"
            style={{ background: 'var(--foreground)', color: 'var(--color-acero-claro)' }}
          >
            Ver tienda online
          </Link>
          <Link
            href="/contacto"
            className="px-6 py-3 text-sm font-medium rounded-full border transition-colors duration-200"
            style={{ borderColor: 'var(--color-granito-claro)', color: 'var(--color-granito-oscuro)' }}
          >
            Solicitar por email
          </Link>
        </div>
      </section>
    </div>
  )
}
