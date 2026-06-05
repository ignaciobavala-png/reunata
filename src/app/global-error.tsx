'use client'

import { useEffect } from 'react'

export default function GlobalError({
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
    <html lang="es">
      <body style={{ margin: 0, background: '#F0F1F3', fontFamily: 'system-ui, sans-serif' }}>
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', marginBottom: '8px', color: '#0D0F11', fontWeight: 400 }}>
            Error crítico
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              marginBottom: '32px',
              color: '#6E7882',
              maxWidth: '280px',
            }}
          >
            Ocurrió un error al cargar la página.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '12px 24px',
              background: '#111316',
              color: '#ECEEF1',
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  )
}
