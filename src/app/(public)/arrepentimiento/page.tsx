import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Botón de arrepentimiento — Reunata' }

export default function ArrepentimientoPage() {
  return (
    <div className="px-6 md:px-16 max-w-5xl mx-auto" style={{ background: 'var(--color-acero-claro)' }}>
      <section className="pt-36 pb-24">
        <p className="text-xs tracking-widest uppercase mb-5" style={{ color: 'var(--color-acero-oscuro)' }}>
          Consumidores — Ley 24.240
        </p>
        <h1 className="text-4xl md:text-6xl leading-tight mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
          Derecho de arrepentimiento.
        </h1>
        <p className="text-base md:text-lg max-w-xl leading-relaxed mb-4" style={{ color: 'var(--color-granito-oscuro)' }}>
          Conforme a la Ley de Defensa del Consumidor (art. 34, Ley 24.240), tenés derecho a revocar la aceptación de tu compra dentro de los <strong>10 días corridos</strong> desde que recibiste el producto o celebraste el contrato, lo que ocurra después.
        </p>
        <p className="text-base max-w-xl leading-relaxed mb-4" style={{ color: 'var(--color-acero-oscuro)' }}>
          El formulario de solicitud formal estará disponible aquí próximamente. Mientras tanto, podés ejercer este derecho comunicándote con nosotros por alguno de los siguientes canales, indicando tu nombre, número de pedido y el motivo:
        </p>
        <ul className="text-base max-w-xl mb-10 space-y-1" style={{ color: 'var(--color-acero-oscuro)' }}>
          <li>→ WhatsApp: +54 9 11 3272-0974</li>
          <li>→ Email a través del formulario de contacto</li>
        </ul>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://wa.me/5491132720974"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 text-sm font-medium rounded-full transition-colors duration-200"
            style={{ background: 'var(--foreground)', color: 'var(--color-acero-claro)' }}
          >
            Contactar por WhatsApp
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
