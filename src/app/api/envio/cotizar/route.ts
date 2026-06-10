import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export interface OpcionEnvio {
  id: string
  descripcion: string
  dias: number
  costo: number
}

const SERVICIO_LABEL: Record<string, string> = {
  N: 'Estándar',
  P: 'Prioritario',
  X: 'Express',
}

export async function POST(req: Request) {
  const token = process.env.ENVIOPACK_ACCESS_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'EnvioPack no configurado.' }, { status: 503 })
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

  const service = createServiceClient()
  const { data: productos } = await service
    .from('productos')
    .select('id, peso, alto, ancho, largo')
    .in('id', items.map(i => i.productoId))

  let pesoTotal = 0
  const paquetes: string[] = []

  for (const item of items) {
    const prod = productos?.find(p => p.id === item.productoId)
    const peso = prod?.peso ? Number(prod.peso) : 0.5
    pesoTotal += peso * item.cantidad

    if (prod?.alto && prod?.ancho && prod?.largo) {
      for (let u = 0; u < item.cantidad; u++) {
        paquetes.push(`${prod.alto}x${prod.ancho}x${prod.largo}`)
      }
    }
  }

  if (pesoTotal < 0.01) pesoTotal = 0.5

  const params = new URLSearchParams({
    access_token: token,
    provincia,
    codigo_postal,
    peso: String(Math.round(pesoTotal * 100) / 100),
  })

  if (paquetes.length > 0) {
    // EnvioPack soporta hasta 20 paquetes en el string
    params.set('paquetes', paquetes.slice(0, 20).join(','))
  }

  try {
    const res = await fetch(
      `https://api.enviopack.com/cotizar/precio/a-domicilio?${params.toString()}`,
      { next: { revalidate: 0 } }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Error al consultar EnvioPack.', opciones: [] }, { status: 200 })
    }

    const raw: { servicio: string; valor: string; horas_entrega: number }[] = await res.json()

    const opciones: OpcionEnvio[] = raw
      .filter(o => o.servicio !== 'R') // excluir devoluciones
      .map(o => ({
        id: o.servicio,
        descripcion: `Envío ${SERVICIO_LABEL[o.servicio] ?? o.servicio}`,
        dias: Math.ceil(o.horas_entrega / 24),
        costo: parseFloat(o.valor),
      }))
      // deduplicar por servicio tomando el más barato
      .reduce<OpcionEnvio[]>((acc, o) => {
        const existe = acc.find(a => a.id === o.id)
        if (!existe || o.costo < existe.costo) {
          return [...acc.filter(a => a.id !== o.id), o]
        }
        return acc
      }, [])
      .sort((a, b) => a.costo - b.costo)

    return NextResponse.json({ opciones, pesoTotal: Math.round(pesoTotal * 100) / 100 })
  } catch {
    return NextResponse.json({ error: 'No se pudo conectar con EnvioPack.', opciones: [] }, { status: 200 })
  }
}
