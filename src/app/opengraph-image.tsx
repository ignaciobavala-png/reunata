import { ImageResponse } from 'next/og'
import { getSiteMeta } from '@/lib/site-meta'

// el título sale de la DB: si se prerenderiza, el PNG queda congelado con el
// valor que había al momento del deploy
export const dynamic = 'force-dynamic'
export const alt = 'Reunata'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OgImage() {
  const { titulo } = await getSiteMeta()

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1a1a1a',
          gap: 24,
        }}
      >
        {/* Línea decorativa superior */}
        <div style={{ width: 60, height: 2, background: '#8faa9c', borderRadius: 2 }} />

        {/* Marca */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 400,
            color: '#f4f1ee',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          Reunata
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: '#8faa9c',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            maxWidth: 1000,
            textAlign: 'center',
          }}
        >
          {titulo}
        </div>

        {/* Línea decorativa inferior */}
        <div style={{ width: 60, height: 2, background: '#8faa9c', borderRadius: 2 }} />

        {/* Subtexto */}
        <div
          style={{
            fontSize: 18,
            color: '#888',
            marginTop: 8,
          }}
        >
          Mates · Termos · Accesorios importados
        </div>
      </div>
    ),
    { ...size }
  )
}
