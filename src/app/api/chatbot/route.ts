import { createClient as createAdmin } from '@supabase/supabase-js'
import Groq from 'groq-sdk'
import { TOOLS, handleToolCall } from '@/lib/chatbot/tools'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getGroq() {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY no configurada')
  return new Groq({ apiKey: process.env.GROQ_API_KEY })
}

async function verificarMaster(request: Request) {
  const userId = request.headers.get('X-User-Id')
  if (!userId) return false

  const { data: profile, error } = await admin
    .from('profiles')
    .select('rol')
    .eq('id', userId)
    .single()

  if (error || !profile) return false
  return profile.rol === 'master'
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

  const productosPorCategoria: Record<string, { total: number; conStock: number; sinStock: number }> = {}
  for (const p of productosCat ?? []) {
    const cat = p.categoria ?? 'Sin categoría'
    if (!productosPorCategoria[cat]) productosPorCategoria[cat] = { total: 0, conStock: 0, sinStock: 0 }
    productosPorCategoria[cat].total++
    if ((p.stock ?? 0) > 0) productosPorCategoria[cat].conStock++
    else productosPorCategoria[cat].sinStock++
  }

  let productosConStock = 0
  let productosSinStock = 0
  for (const v of Object.values(productosPorCategoria)) {
    productosConStock += v.conStock
    productosSinStock += v.sinStock
  }

  const pedidosPorEstado: Record<string, number> = {}
  for (const p of pedidosEstado ?? []) {
    pedidosPorEstado[p.estado] = (pedidosPorEstado[p.estado] ?? 0) + 1
  }

  const totalPedidosRecientes = pedidosRecientes?.length ?? 0
  const montoPedidosRecientes = (pedidosRecientes ?? []).reduce((sum, p) => sum + (p.total_usd ?? 0), 0)

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

TENÉS ACCESO A HERRAMIENTAS (tools) para consultar datos específicos. Usalas cuando necesites información detallada que no esté en los KPIs. Ejemplos:
- search_products: para buscar productos por nombre o código
- get_product_detail: para ver todos los campos de un producto (precios, stock, fotos)
- list_orders / get_order_detail: para consultar pedidos
- list_clients / get_client_detail: para consultar clientes
- get_sync_status: para ver el historial de sincronización con Gesu
- get_categories_summary: resumen de productos por categoría
- get_public_channel_status: estado del canal público

LO QUE PODÉS HACER:
- Explicar cómo funciona cualquier sección de la plataforma
- Consultar datos específicos usando las herramientas disponibles
- Analizar KPIs y detectar patrones, anomalías o áreas de mejora
- Sugerir acciones basadas en los datos

LO QUE NO PODÉS HACER BAJO NINGÚN CONCEPTO:
- Modificar ningún dato del sistema (las herramientas son solo lectura)
- Tomar decisiones por el administrador ni ejecutar acciones
- Inventar datos. Usá las herramientas para obtener información precisa.

IMPORTANTE: sé conciso, directo y útil. Cuando el usuario pregunte por datos específicos (productos, clientes, pedidos), usá las herramientas para obtener información precisa.`
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

  const messages: { role: 'system' | 'user' | 'assistant' | 'tool'; content: string; tool_call_id?: string; name?: string }[] = [
    { role: 'system', content: systemPrompt },
    ...body.messages,
  ]

  // Function calling loop (máx 3 iteraciones)
  const MAX_ITERATIONS = 3
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: messages as any,
      tools: TOOLS as any,
      tool_choice: i < MAX_ITERATIONS - 1 ? 'auto' : 'none',
      temperature: 0.4,
      max_tokens: 2048,
    })

    const choice = completion.choices[0]
    const toolCalls = choice?.message?.tool_calls

    if (!toolCalls?.length) {
      // Respuesta final — stream al cliente
      const content = choice?.message?.content ?? ''
      const encoder = new TextEncoder()
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(content))
            controller.close()
          },
        }),
        {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
          },
        }
      )
    }

    // Ejecutar tools
    messages.push(choice.message as any)

    for (const tc of toolCalls) {
      const fn = tc.function
      let result: unknown
      try {
        const args = JSON.parse(fn.arguments)
        result = await handleToolCall(fn.name, args)
      } catch (err) {
        result = { error: `Error al ejecutar ${fn.name}: ${err instanceof Error ? err.message : 'desconocido'}` }
      }

      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        name: fn.name,
        content: JSON.stringify(result),
      } as any)
    }
  }

  // Si llegamos acá, el modelo no dio respuesta final en 3 iteraciones
  return Response.json({ error: 'El asistente no pudo completar la consulta. Intentá con una pregunta más específica.' }, { status: 500 })
}
