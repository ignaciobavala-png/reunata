import { NextResponse } from 'next/server'
import { cotizarEnvio } from '@/lib/enviopack'

export type { OpcionEnvio } from '@/lib/enviopack'

// Rate limiting por IP — module-level Map (best-effort en serverless).
// Para escala real: reemplazar por Vercel KV o middleware edge.
const RL_MAP = new Map<string, { count: number; resetAt: number }>()
const RL_MAX = 10        // requests por ventana
const RL_WINDOW = 60_000 // 1 minuto en ms

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = RL_MAP.get(ip)
  if (!entry || now > entry.resetAt) {
    RL_MAP.set(ip, { count: 1, resetAt: now + RL_WINDOW })
    return true
  }
  if (entry.count >= RL_MAX) return false
  entry.count++
  return true
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Esperá un minuto antes de intentar de nuevo.' },
      { status: 429 }
    )
  }

  const body = await req.json()
  const { items, codigo_postal, provincia } = body as {
    items: { productoId: number; cantidad: number }[]
    codigo_postal: string
    provincia: string
  }

  if (!items?.length || !codigo_postal || !provincia) {
    return NextResponse.json({ error: 'Parámetros incompletos.' }, { status: 400 })
  }

  const result = await cotizarEnvio({ items, codigo_postal, provincia })
  return NextResponse.json(result)
}
