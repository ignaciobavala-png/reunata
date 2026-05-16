import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Puntos de venta — Reunata' }

export default function PuntosDeVentaPage() {
  return (
    <div className="px-6 md:px-16 max-w-5xl mx-auto" style={{ background: 'var(--color-acero-claro)' }}>
      <section className="pt-36 pb-24">
        <p className="text-xs tracking-widest uppercase mb-5" style={{ color: 'var(--color-acero-oscuro)' }}>
          Puntos de venta
        </p>
        <h1 className="text-4xl md:text-6xl leading-tight mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
          Encontrá Reunata cerca tuyo.
        </h1>
        <p className="text-base md:text-lg max-w-xl leading-relaxed mb-4" style={{ color: 'var(--color-granito-oscuro)' }}>
          Estamos preparando el mapa de distribuidores y locales autorizados en todo el país. Muy pronto vas a poder ubicar el punto de venta más cercano.
        </p>
        <p className="text-base max-w-xl leading-relaxed mb-10" style={{ color: 'var(--color-acero-oscuro)' }}>
          Por ahora podés consultarnos directo por WhatsApp y te indicamos la opción más conveniente para tu zona.
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
            href="/tienda"
            className="px-6 py-3 text-sm font-medium rounded-full border transition-colors duration-200"
            style={{ borderColor: 'var(--color-granito-claro)', color: 'var(--color-granito-oscuro)' }}
          >
            Ver tienda online
          </Link>
        </div>
      </section>
    </div>
  )
}
