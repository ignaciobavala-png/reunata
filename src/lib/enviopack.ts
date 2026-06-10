import { createServiceClient } from '@/lib/supabase/server'

export interface OpcionEnvio {
  id: string           // "N" | "P" | "X"
  descripcion: string  // "Envío Estándar"
  dias: number
  costo: number
}

const SERVICIO_LABEL: Record<string, string> = {
  N: 'Estándar',
  P: 'Prioritario',
  X: 'Express',
}

export async function cotizarEnvio({
  items,
  codigo_postal,
  provincia,
}: {
  items: { productoId: number; cantidad: number }[]
  codigo_postal: string
  provincia: string
}): Promise<{ opciones: OpcionEnvio[]; error?: string }> {
  const token = process.env.ENVIOPACK_ACCESS_TOKEN
  if (!token) return { opciones: [], error: 'EnvioPack no configurado.' }

  const service = createServiceClient()
  const { data: productos } = await service
    .from('productos')
    .select('id, peso, alto, ancho, largo, enviar_solo')
    .in('id', items.map(i => i.productoId))

  let pesoTotal = 0
  const paquetes: string[] = []

  for (const item of items) {
    const prod = productos?.find(p => p.id === item.productoId)
    // Fix #1: usar != null para que peso=0 sea válido
    const peso = prod?.peso != null ? Number(prod.peso) : 0.5
    pesoTotal += peso * item.cantidad

    if (prod?.alto && prod?.ancho && prod?.largo) {
      const dims = `${prod.alto}x${prod.ancho}x${prod.largo}`
      // Fix #4: enviar_solo → cada unidad va en su propia entrada
      const unidades = prod.enviar_solo ? item.cantidad : item.cantidad
      for (let u = 0; u < unidades; u++) {
        paquetes.push(dims)
      }
    }
  }

  if (pesoTotal === 0) pesoTotal = 0.5

  const params = new URLSearchParams({
    access_token: token,
    provincia,
    codigo_postal,
    peso: String(Math.round(pesoTotal * 100) / 100),
  })

  // Fix #7: no truncar paquetes — enviar todos
  if (paquetes.length > 0) {
    params.set('paquetes', paquetes.join(','))
  }

  try {
    const res = await fetch(
      `https://api.enviopack.com/cotizar/precio/a-domicilio?${params.toString()}`
    )
    if (!res.ok) return { opciones: [], error: 'Error al consultar EnvioPack.' }

    const raw: { servicio: string; valor: string; horas_entrega: number }[] = await res.json()

    const opciones: OpcionEnvio[] = raw
      .filter(o => o.servicio !== 'R')
      .map(o => ({
        id: o.servicio,
        descripcion: `Envío ${SERVICIO_LABEL[o.servicio] ?? o.servicio}`,
        dias: Math.ceil(o.horas_entrega / 24),
        costo: parseFloat(o.valor),
      }))
      .reduce<OpcionEnvio[]>((acc, o) => {
        const existe = acc.find(a => a.id === o.id)
        if (!existe || o.costo < existe.costo) {
          return [...acc.filter(a => a.id !== o.id), o]
        }
        return acc
      }, [])
      .sort((a, b) => a.costo - b.costo)

    return { opciones }
  } catch {
    return { opciones: [], error: 'No se pudo conectar con EnvioPack.' }
  }
}
