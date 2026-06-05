import Link from 'next/link'

export default function NotFound() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--background)' }}
    >
      <p
        className="text-8xl mb-6 tabular-nums font-light"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-acero-claro)' }}
      >
        404
      </p>
      <h1
        className="text-2xl mb-2"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}
      >
        Página no encontrada
      </h1>
      <p className="text-sm mb-8 max-w-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
        La dirección que buscás no existe o fue movida.
      </p>
      <Link
        href="/"
        className="px-6 py-3 text-xs tracking-widest uppercase transition-opacity hover:opacity-80"
        style={{ background: 'var(--color-granito-oscuro)', color: 'var(--color-acero-brillo)' }}
      >
        Ir al inicio
      </Link>
    </main>
  )
}
