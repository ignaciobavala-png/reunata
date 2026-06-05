'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--background)' }}
    >
      <h1
        className="text-2xl mb-2"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}
      >
        Algo salió mal
      </h1>
      <p className="text-sm mb-8 max-w-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
        Ocurrió un error inesperado. Podés intentar recargar la página.
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 text-xs tracking-widest uppercase transition-opacity hover:opacity-80"
        style={{ background: 'var(--color-granito-oscuro)', color: 'var(--color-acero-brillo)' }}
      >
        Recargar
      </button>
    </main>
  )
}
