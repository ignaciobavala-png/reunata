'use client'

import Link from 'next/link'

export default function CartError({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 pt-24">
      <div className="text-center">
        <p className="text-xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
          No pudimos cargar tu carrito
        </p>
        <p className="text-sm mb-8" style={{ color: 'var(--color-acero-oscuro)' }}>
          Ocurrió un error inesperado. Podés intentar recargar o volver a la tienda.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 text-xs tracking-widest uppercase transition-opacity hover:opacity-80"
          style={{ background: 'var(--color-granito-oscuro)', color: 'var(--color-acero-brillo)' }}
        >
          Reintentar
        </button>
        <Link
          href="/tienda"
          className="px-5 py-2.5 text-xs tracking-widest uppercase border transition-opacity hover:opacity-70"
          style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}
        >
          Ver tienda
        </Link>
      </div>
    </div>
  )
}
