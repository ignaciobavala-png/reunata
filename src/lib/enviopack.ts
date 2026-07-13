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

  const apiKey    = process.env.ENVIOPACK_API_KEY?.trim()
  const secretKey = process.env.ENVIOPACK_SECRET_KEY?.trim()
  if (!apiKey || !secretKey) {
    console.error('[enviopack] vars no configuradas:', { apiKey: !!apiKey, secretKey: !!secretKey })
    return null
  }

  try {
    const res = await fetch('https://api.enviopack.com/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 'api-key': apiKey, 'secret-key': secretKey }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error('[enviopack] auth falló:', res.status, body.slice(0, 120))
      return null
    }
    const data = await res.json()
    const jwt: string = data.token
    if (!jwt) {
      console.error('[enviopack] respuesta sin token: keys =', Object.keys(data ?? {}))
      return null
    }

    // Leer exp del payload del JWT (sin verificar firma — solo para caché)
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString())
    tokenExpiresAt = payload.exp * 1000
    cachedToken = jwt
    return cachedToken
  } catch {
    return null
  }
}

// Peso total (kg) y lista de paquetes "AxBxC" a partir de items del pedido.
// Compartido entre cotización y creación de envío.
async function calcularPaquetes(items: { productoId: number; cantidad: number }[]) {
  const service = createServiceClient()
  const { data: productos } = await service
    .from('productos')
    .select('id, peso, alto, ancho, largo')
    .in('id', items.map(i => i.productoId))

  let pesoTotal = 0
  const paquetes: { alto: number; ancho: number; largo: number; peso: number }[] = []

  for (const item of items) {
    const prod = productos?.find(p => p.id === item.productoId)
    const peso = prod?.peso != null ? Number(prod.peso) : 0.5
    pesoTotal += peso * item.cantidad
    for (let u = 0; u < item.cantidad; u++) {
      paquetes.push({
        alto: prod?.alto ? Number(prod.alto) : 10,
        ancho: prod?.ancho ? Number(prod.ancho) : 10,
        largo: prod?.largo ? Number(prod.largo) : 10,
        peso: peso,
      })
    }
  }
  if (pesoTotal === 0) pesoTotal = 0.5
  return { pesoTotal, paquetes }
}

// ID del depósito de origen. Preferido por env; si no está, se descubre por API
// y se loguea para poder fijarlo. Enviopack lo llama "dirección de envío".
async function getDireccionOrigenId(token: string): Promise<string | null> {
  const fromEnv = process.env.ENVIOPACK_DIRECCION_ORIGEN_ID?.trim()
  if (fromEnv) return fromEnv
  try {
    const res = await fetch('https://api.enviopack.com/direcciones-de-envio', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      console.error('[enviopack] direcciones-de-envio falló:', res.status)
      return null
    }
    const data = await res.json()
    const lista = Array.isArray(data) ? data : (data?.data ?? [])
    const id = lista[0]?.id != null ? String(lista[0].id) : null
    console.log('[enviopack] dirección origen autodescubierta:', id, '— fijala en ENVIOPACK_DIRECCION_ORIGEN_ID')
    return id
  } catch {
    return null
  }
}

// Crea el envío en Enviopack para un pedido: POST /pedidos + POST /envios.
// Por defecto lo crea SIN confirmar (borrador, no gasta saldo ni exige correo).
// Con ENVIOPACK_CONFIRMAR=true lo confirma (requiere cuenta con saldo + servicio).
export async function crearEnvioEnviopack(pedidoId: string): Promise<{
  ok: boolean; envioId?: string; estado?: string; error?: string
}> {
  const token = await getAccessToken()
  if (!token) return { ok: false, error: 'EnvioPack no configurado.' }

  const service = createServiceClient()
  const { data: pedido } = await service
    .from('pedidos')
    .select(`
      id, numero, total_usd, estado, enviopack_envio_id,
      envio_calle, envio_numero, envio_piso, envio_codigo_postal, envio_provincia, envio_localidad, envio_servicio,
      guest_nombre, guest_email,
      cliente:cliente_id ( nombre, email ),
      pedido_items ( cantidad, producto_id )
    `)
    .eq('id', pedidoId)
    .single()

  if (!pedido) return { ok: false, error: 'Pedido no encontrado.' }
  if (pedido.enviopack_envio_id) return { ok: false, error: 'Este pedido ya tiene un envío generado.' }
  if (!pedido.envio_calle || !pedido.envio_codigo_postal || !pedido.envio_provincia) {
    return { ok: false, error: 'El pedido no tiene dirección de envío completa.' }
  }

  const direccionOrigen = await getDireccionOrigenId(token)
  if (!direccionOrigen) return { ok: false, error: 'No se pudo determinar el depósito de origen.' }

  const cliente = pedido.cliente as unknown as { nombre?: string; email?: string } | null
  const nombreCompleto = (cliente?.nombre ?? pedido.guest_nombre ?? 'Cliente').trim()
  const [nombre, ...restoApellido] = nombreCompleto.split(' ')
  const apellido = restoApellido.join(' ') || '.'
  const email = cliente?.email ?? pedido.guest_email ?? 'sin-email@reunata.com'

  const items = (pedido.pedido_items ?? []).map((i: { cantidad: number; producto_id: number }) => ({
    productoId: i.producto_id, cantidad: i.cantidad,
  }))
  const { paquetes } = await calcularPaquetes(items)

  try {
    // 1) Crear el pedido en Enviopack
    const pedidoRes = await fetch('https://api.enviopack.com/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        id_externo: String(pedido.numero),
        nombre,
        apellido,
        email,
        monto: Number(pedido.total_usd),
        fecha_alta: new Date().toISOString().slice(0, 19).replace('T', ' '),
        pagado: ['pago_confirmado', 'sena_confirmada'].includes(pedido.estado),
      }),
    })
    if (!pedidoRes.ok) {
      const body = await pedidoRes.text()
      console.error('[enviopack] POST /pedidos falló:', pedidoRes.status, body.slice(0, 300))
      return { ok: false, error: 'Enviopack rechazó el pedido. Revisá los logs.' }
    }
    const pedidoData = await pedidoRes.json()
    const enviopackPedidoId = pedidoData?.id
    if (!enviopackPedidoId) return { ok: false, error: 'Enviopack no devolvió id de pedido.' }

    // 2) Crear el envío
    const confirmar = process.env.ENVIOPACK_CONFIRMAR?.trim() === 'true'
    const envioBody: Record<string, unknown> = {
      pedido: enviopackPedidoId,
      direccion_envio: direccionOrigen,
      destinatario: nombreCompleto,
      modalidad: 'D',
      confirmado: confirmar,
      paquetes,
      calle: pedido.envio_calle,
      numero: pedido.envio_numero ?? 'S/N',
      codigo_postal: pedido.envio_codigo_postal,
      provincia: pedido.envio_provincia,
    }
    if (pedido.envio_piso) envioBody.piso = pedido.envio_piso
    if (pedido.envio_localidad) envioBody.localidad = pedido.envio_localidad
    // Al confirmar hace falta el servicio elegido (correo se resuelve en Enviopack/panel)
    if (confirmar && pedido.envio_servicio) envioBody.servicio = pedido.envio_servicio

    const envioRes = await fetch('https://api.enviopack.com/envios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(envioBody),
    })
    if (!envioRes.ok) {
      const body = await envioRes.text()
      console.error('[enviopack] POST /envios falló:', envioRes.status, body.slice(0, 300))
      return { ok: false, error: 'Enviopack rechazó el envío. Revisá los logs.' }
    }
    const envioData = await envioRes.json()
    const envioId = envioData?.id != null ? String(envioData.id) : null
    if (!envioId) return { ok: false, error: 'Enviopack no devolvió id de envío.' }

    return { ok: true, envioId, estado: confirmar ? 'en_proceso' : 'sin_confirmar' }
  } catch (e) {
    console.error('[enviopack] error creando envío:', e)
    return { ok: false, error: 'No se pudo conectar con EnvioPack.' }
  }
}

// Consulta el estado real de un envío en Enviopack. Fuente de verdad para el
// webhook (que llega sin firma y no debe confiarse) y para el botón de refresco.
// Un envío está "procesado" (etiqueta disponible) cuando tiene tracking asignado.
export async function consultarEnvioEnviopack(envioId: string): Promise<{
  ok: boolean
  estado?: string          // código crudo de Enviopack (ej. "B" = borrador)
  confirmado?: boolean
  trackingNumber?: string | null
  procesado?: boolean
  error?: string
}> {
  const token = await getAccessToken()
  if (!token) return { ok: false, error: 'EnvioPack no configurado.' }
  try {
    const res = await fetch(`https://api.enviopack.com/envios/${encodeURIComponent(envioId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      if (res.status === 401) cachedToken = null
      return { ok: false, error: `Enviopack respondió ${res.status}.` }
    }
    const data = await res.json()
    const trackingNumber: string | null = data?.tracking_number ?? null
    return {
      ok: true,
      estado: data?.estado ?? undefined,
      confirmado: Boolean(data?.confirmado),
      trackingNumber,
      procesado: trackingNumber != null && trackingNumber !== '',
    }
  } catch {
    return { ok: false, error: 'No se pudo conectar con EnvioPack.' }
  }
}

// Descarga la etiqueta PDF de un envío. Solo disponible cuando el envío está
// procesado; si no, Enviopack devuelve error y lo propagamos legible.
export async function getEtiquetaPdf(envioId: string): Promise<{
  ok: boolean; pdf?: ArrayBuffer; error?: string
}> {
  const token = await getAccessToken()
  if (!token) return { ok: false, error: 'EnvioPack no configurado.' }
  try {
    const res = await fetch(
      `https://api.enviopack.com/envios/${encodeURIComponent(envioId)}/etiqueta?formato=pdf`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) {
      if (res.status === 401) cachedToken = null
      const body = await res.text()
      console.error('[enviopack] etiqueta falló:', res.status, body.slice(0, 200))
      return { ok: false, error: 'La etiqueta todavía no está disponible en Enviopack.' }
    }
    return { ok: true, pdf: await res.arrayBuffer() }
  } catch {
    return { ok: false, error: 'No se pudo conectar con EnvioPack.' }
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
