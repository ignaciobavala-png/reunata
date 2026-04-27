import { createClient as createAdmin } from '@supabase/supabase-js'
import Groq from 'groq-sdk'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getGroq() {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY no configurada')
  return new Groq({ apiKey: process.env.GROQ_API_KEY })
}

async function verificarMaster(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return false

  const accessToken = authHeader.slice(7)
  if (!accessToken) return false

  const { data: { user }, error } = await admin.auth.getUser(accessToken)
  if (error || !user) return false

  const { data: profile } = await admin.from('profiles').select('rol').eq('id', user.id).single()
  return profile?.rol === 'master'
}

async function fetchKPIs() {
  const [
    { count: totalProductos },
    { count: conFoto },
    { data: productosCat },
    { data: pedidosEstado },
    { data: pedidosRecientes },
    { data: clientesCanal },
    { data: clientesNuevos },
    { data: syncLog },
  ] = await Promise.all([
    admin.from('productos').select('*', { count: 'exact', head: true }).eq('activo', true),
    admin.from('producto_fotos').select('*', { count: 'exact', head: true }).select('producto_id'),
    admin.from('productos').select('categoria, stock').eq('activo', true),
    admin.from('pedidos').select('estado'),
    admin.from('pedidos').select('total_usd').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    admin.from('profiles').select('canal_id, canales(slug)').in('rol', ['consumidor_final', 'distribuidor', 'local', 'mercha']),
    admin.from('profiles').select('id').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    admin.from('sync_log').select('*').order('created_at', { ascending: false }).limit(1),
  ])

  // Productos por categoría
  const productosPorCategoria: Record<string, { total: number; conStock: number; sinStock: number }> = {}
  for (const p of productosCat ?? []) {
    const cat = p.categoria ?? 'Sin categoría'
    if (!productosPorCategoria[cat]) productosPorCategoria[cat] = { total: 0, conStock: 0, sinStock: 0 }
    productosPorCategoria[cat].total++
    if ((p.stock ?? 0) > 0) productosPorCategoria[cat].conStock++
    else productosPorCategoria[cat].sinStock++
  }

  // Stock general
  let productosConStock = 0
  let productosSinStock = 0
  for (const v of Object.values(productosPorCategoria)) {
    productosConStock += v.conStock
    productosSinStock += v.sinStock
  }

  // Pedidos por estado
  const pedidosPorEstado: Record<string, number> = {}
  for (const p of pedidosEstado ?? []) {
    pedidosPorEstado[p.estado] = (pedidosPorEstado[p.estado] ?? 0) + 1
  }

  // Pedidos recientes (últimos 7 días)
  const totalPedidosRecientes = pedidosRecientes?.length ?? 0
  const montoPedidosRecientes = (pedidosRecientes ?? []).reduce((sum, p) => sum + (p.total_usd ?? 0), 0)

  // Clientes por canal
  const clientesPorCanal: Record<string, number> = {}
  for (const c of clientesCanal ?? []) {
    const canal = (c.canales as unknown as { slug: string } | null)?.slug ?? 'sin_canal'
    clientesPorCanal[canal] = (clientesPorCanal[canal] ?? 0) + 1
  }

  const ultimoSync = syncLog?.[0] ?? null

  return {
    totalProductos: totalProductos ?? 0,
    conFoto: conFoto ?? 0,
    sinFoto: (totalProductos ?? 0) - (conFoto ?? 0),
    productosConStock,
    productosSinStock,
    productosPorCategoria,
    pedidosPorEstado,
    pedidosRecientes: { cantidad: totalPedidosRecientes, montoTotalUSD: Math.round(montoPedidosRecientes * 100) / 100 },
    clientesPorCanal,
    clientesNuevosEsteMes: clientesNuevos?.length ?? 0,
    ultimoSync: ultimoSync ? `${ultimoSync.tipo} — ${ultimoSync.registros} registros — ${new Date(ultimoSync.created_at).toLocaleString('es-AR')}` : 'Nunca',
  }
}

function buildSystemPrompt(kpis: Record<string, unknown>) {
  return `Sos BotManager, el asistente IA de Reunata, una distribuidora mayorista B2B de mates, termos y accesorios ubicada en Argentina. Tu función es asistir al administrador con información, análisis y recomendaciones basadas en datos del negocio.

CONTEXTO DEL NEGOCIO:
- 5 canales de venta: Consumidor Final, Distribuidor, Local, Merchandising, Público
- Roles internos: master (admin total), empleado (pedidos y clientes), comisionista (sus pedidos y clientes)
- 4 roles de cliente: consumidor_final, distribuidor, local, mercha
- Productos sincronizados desde Gesu (ERP externo del proveedor) cada 2 horas
- Pedidos en 8 estados: borrador → pendiente → confirmado → en_preparacion → listo → enviado → entregado → cancelado
- Cada canal tiene su propia lista de precios (lista1 a lista5)
- El catálogo público muestra productos del canal "Público" (sin precios, solo fotos y nombres)
- Secciones del dashboard admin: Inicio, Productos, Multimedia, Canales, Pedidos, Clientes, Equipo, Sincronizar, Configuración, Chatbot

KPIs ACTUALES (datos en vivo al momento de esta consulta):
${JSON.stringify(kpis, null, 2)}

LO QUE PODÉS HACER:
- Explicar cómo funciona cualquier sección de la plataforma
- Consultar cuántos productos hay por categoría, con o sin stock (los KPIs incluyen desglose por categoría)
- Analizar los KPIs provistos y detectar patrones, anomalías o áreas de mejora
- Informar sobre pedidos recientes (últimos 7 días) con montos en USD
- Decir cuántos clientes hay por canal y cuántos se registraron este mes
- Sugerir acciones basadas en los datos (ej: "la categoría X tiene muchos productos sin stock, revisá el sync")
- Ayudar a interpretar métricas y tendencias del negocio
- Responder preguntas sobre roles, canales, flujos de trabajo y funcionalidades

LO QUE NO PODÉS HACER BAJO NINGÚN CONCEPTO:
- Modificar ningún dato del sistema (no tenés acceso de escritura)
- Acceder a información de clientes o productos individuales (solo ves los agregados en KPIs)
- Hacer afirmaciones sobre precios, stock o datos específicos que no figuren en los KPIs
- Tomar decisiones por el administrador ni ejecutar acciones
- Inventar datos o estadísticas. Si no tenés información suficiente, decilo claramente: "No tengo acceso a ese nivel de detalle, pero puedo ayudarte a..."

IMPORTANTE: sé conciso, directo y útil. No hagas introducciones largas ni rodeos. Si te preguntan algo que no podés responder, explicalo brevemente.`
}

export async function POST(request: Request) {
  if (!await verificarMaster(request)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: { messages: { role: 'user' | 'assistant'; content: string }[] }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (!body.messages?.length) {
    return Response.json({ error: 'Sin mensajes' }, { status: 400 })
  }

  const kpis = await fetchKPIs()
  const systemPrompt = buildSystemPrompt(kpis)

  const groq = getGroq()
  const stream = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      ...body.messages,
    ],
    stream: true,
    temperature: 0.4,
    max_tokens: 2048,
  })

  const encoder = new TextEncoder()

  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content
            if (content) {
              controller.enqueue(encoder.encode(content))
            }
          }
        } catch (err) {
          console.error('Error en stream de Groq:', err)
        }
        controller.close()
      },
    }),
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    }
  )
}
