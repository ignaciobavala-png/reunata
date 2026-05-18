import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Favoritos — Reunata' }

export default function FavoritosPage() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--background)' }}>
      <div className="px-6 md:px-16 max-w-3xl mx-auto py-28 md:py-36 flex flex-col items-center text-center gap-6">
        <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-acero-oscuro)' }}>
          Próximamente
        </p>
        <h1 className="text-3xl md:text-5xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
          Favoritos
        </h1>
        <p className="text-sm max-w-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
          Pronto vas a poder guardar tus productos favoritos y acceder a ellos fácilmente desde tu cuenta.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Link
            href="/tienda"
            className="px-6 py-3 rounded-md text-xs tracking-widest uppercase transition-opacity hover:opacity-80"
            style={{ background: 'var(--color-acero-claro)', color: 'var(--color-granito-oscuro)' }}
          >
            Ver catálogo
          </Link>
          <Link
            href="/registro"
            className="px-6 py-3 rounded-md text-xs tracking-widest uppercase transition-opacity hover:opacity-80"
            style={{ border: '1px solid rgba(168,176,187,0.35)', color: 'var(--foreground)' }}
          >
            Crear cuenta
          </Link>
        </div>
      </div>
    </main>
  )
}
