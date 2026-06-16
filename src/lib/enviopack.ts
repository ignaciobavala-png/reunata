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

// Token JWT — caduca cada 4h. Se renueva automáticamente.
let cachedToken: string | null = null
let tokenExpiresAt = 0

async function getAccessToken(): Promise<string | null> {
  const now = Date.now()
  // Renovar 5 minutos antes de que expire
  if (cachedToken && now < tokenExpiresAt - 300_000) return cachedToken

  const apiKey    = process.env.ENVIOPACK_API_KEY
  const secretKey = process.env.ENVIOPACK_SECRET_KEY
  if (!apiKey || !secretKey) return null

  try {
    const res = await fetch('https://api.enviopack.com/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 'api-key': apiKey, 'secret-key': secretKey }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const jwt: string = data.token
    if (!jwt) return null

    // Leer exp del payload del JWT (sin verificar firma — solo para caché)
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString())
    tokenExpiresAt = payload.exp * 1000
    cachedToken = jwt
    return cachedToken
  } catch {
    return null
  }
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
  const token = await getAccessToken()
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
    const peso = prod?.peso != null ? Number(prod.peso) : 0.5
    pesoTotal += peso * item.cantidad

    if (prod?.alto && prod?.ancho && prod?.largo) {
      const dims = `${prod.alto}x${prod.ancho}x${prod.largo}`
      for (let u = 0; u < item.cantidad; u++) {
        paquetes.push(dims)
      }
    }
  }

  if (pesoTotal === 0) pesoTotal = 0.5

  const params = new URLSearchParams({
    provincia,
    codigo_postal,
    peso: String(Math.round(pesoTotal * 100) / 100),
  })

  if (paquetes.length > 0) {
    params.set('paquetes', paquetes.join(','))
  }

  try {
    const res = await fetch(
      `https://api.enviopack.com/cotizar/precio/a-domicilio?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) {
      // Token rechazado — forzar renovación en el próximo intento
      if (res.status === 401) cachedToken = null
      return { opciones: [], error: 'Error al consultar EnvioPack.' }
    }

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
