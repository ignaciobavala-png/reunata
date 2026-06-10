import { NextResponse } from 'next/server'
import { cotizarEnvio } from '@/lib/enviopack'

export type { OpcionEnvio } from '@/lib/enviopack'

export async function POST(req: Request) {
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
