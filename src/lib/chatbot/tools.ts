import { createClient as createAdmin } from '@supabase/supabase-js'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Tool Definitions (OpenAI-compatible format for Groq) ────────────────

export const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'search_products',
      description: 'Buscar productos por nombre, código interno o categoría. Devuelve lista de coincidencias con stock.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Texto a buscar en título o código interno' },
          categoria: { type: 'string', description: 'Filtrar por slug de categoría (opcional)' },
          limit: { type: 'number', description: 'Máximo de resultados (default 10)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_product_detail',
      description: 'Obtener todos los detalles de un producto incluyendo precios de lista y costo.',
      parameters: {
        type: 'object',
        properties: {
          productId: { type: 'number', description: 'ID del producto' },
        },
        required: ['productId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_orders',
      description: 'Listar pedidos con filtros opcionales. Devuelve datos agregados (id, estado, total, fecha, cliente nombre).',
      parameters: {
        type: 'object',
        properties: {
          estado: { type: 'string', description: 'Filtrar por estado (pendiente, confirmado, en_preparacion, enviado, entregado, cancelado). Vacío = todos.' },
          limit: { type: 'number', description: 'Máximo de resultados (default 20)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_order_detail',
      description: 'Obtener detalle completo de un pedido con sus ítems, cantidades, precios y montos.',
      parameters: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'ID del pedido (UUID)' },
        },
        required: ['orderId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_clients',
      description: 'Listar clientes con filtros. Datos: nombre, email, rol, aprobado, canal, fecha de registro.',
      parameters: {
        type: 'object',
        properties: {
          canal: { type: 'string', description: 'Filtrar por slug del canal (consumidor_final, distribuidor, local, mercha). Vacío = todos.' },
          aprobado: { type: 'boolean', description: 'Filtrar por estado de aprobación' },
          limit: { type: 'number', description: 'Máximo de resultados (default 20)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_client_detail',
      description: 'Obtener perfil completo de un cliente: datos personales, canal, aprobación, fecha de registro.',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string', description: 'ID del cliente (UUID)' },
        },
        required: ['clientId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_sync_status',
      description: 'Obtener historial de sincronizaciones con Gesu.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Cantidad de registros (default 5)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_categories_summary',
      description: 'Resumen de productos por categoría con stock y sin stock.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_public_channel_status',
      description: 'Estado del canal público: cuántos productos son visibles al público por categoría.',
      parameters: {
        type: 'object',
        properties: {
          categoria: { type: 'string', description: 'Filtrar por categoría específica (opcional)' },
        },
        required: [],
      },
    },
  },
]

// ─── Tool Handlers (read-only Supabase queries) ──────────────────────────

export async function handleToolCall(name: string, args: Record<string, unknown>) {
  switch (name) {
    case 'search_products': {
      const searchTerm = String(args.query ?? '').replace(/[*()',"]/g, '').trim()
      const cat = args.categoria as string | undefined
      const limit = Math.min((args.limit as number) ?? 10, 20)

      let q = admin
        .from('productos')
        .select('id, codigo_interno, titulo, categoria, stock, producto_fotos(url, orden)')
        .eq('activo', true)
        .or(`titulo.ilike.*${searchTerm}*,codigo_interno.ilike.*${searchTerm}*`)
        .limit(limit)

      if (cat) q = q.eq('categoria', cat)

      const { data } = await q.order('titulo')
      return (data ?? []).map(p => ({
        id: p.id, codigo: p.codigo_interno, titulo: p.titulo,
        categoria: p.categoria, stock: p.stock,
        tieneFoto: ((p.producto_fotos as unknown[]) ?? []).length > 0,
      }))
    }

    case 'get_product_detail': {
      const productId = args.productId as number
      const { data } = await admin
        .from('productos')
        .select('*')
        .eq('id', productId)
        .single()
      return data ?? { error: 'Producto no encontrado' }
    }

    case 'list_orders': {
      const estado = args.estado as string | undefined
      const limit = Math.min((args.limit as number) ?? 20, 50)

      let q = admin
        .from('pedidos')
        .select('id, estado, total_usd, medio_pago, created_at, cliente:cliente_id(nombre)')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (estado) q = q.eq('estado', estado)

      const { data } = await q
      return (data ?? []).map(o => ({
        id: o.id, estado: o.estado, total_usd: o.total_usd,
        medio_pago: o.medio_pago, fecha: o.created_at,
        cliente: (o.cliente as unknown as { nombre: string } | null)?.nombre ?? 'N/A',
      }))
    }

    case 'get_order_detail': {
      const orderId = args.orderId as string
      const { data: pedido } = await admin
        .from('pedidos')
        .select('id, estado, total_usd, medio_pago, created_at, cliente:cliente_id(nombre)')
        .eq('id', orderId)
        .single()

      if (!pedido) return { error: 'Pedido no encontrado' }

      const { data: items } = await admin
        .from('pedido_items')
        .select('producto_id, cantidad, precio_unitario, producto:producto_id(titulo, codigo_interno)')
        .eq('pedido_id', orderId)

      return {
        ...pedido,
        cliente: (pedido.cliente as unknown as { nombre: string } | null)?.nombre ?? 'N/A',
        items: (items ?? []).map(i => ({
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          producto: (i.producto as unknown as { titulo: string; codigo_interno: string } | null)?.titulo ?? i.producto_id,
          codigo: (i.producto as unknown as { codigo_interno: string } | null)?.codigo_interno ?? '',
        })),
      }
    }

    case 'list_clients': {
      const canal = args.canal as string | undefined
      const aprobado = args.aprobado as boolean | undefined
      const limit = Math.min((args.limit as number) ?? 20, 50)

      let q = admin
        .from('profiles')
        .select('id, nombre, email, rol, aprobado, canal_id, created_at, canales!inner(slug)')
        .in('rol', ['consumidor_final', 'distribuidor', 'local', 'mercha'])
        .order('created_at', { ascending: false })
        .limit(limit)

      if (canal) q = q.eq('canales.slug', canal)
      if (aprobado !== undefined) q = q.eq('aprobado', aprobado)

      const { data } = await q
      return (data ?? []).map(c => ({
        id: c.id, nombre: c.nombre, email: c.email,
        rol: c.rol, aprobado: c.aprobado,
        canal: (c.canales as unknown as { slug: string } | null)?.slug ?? 'sin_canal',
        fecha: c.created_at,
      }))
    }

    case 'get_client_detail': {
      const clientId = args.clientId as string
      const { data } = await admin
        .from('profiles')
        .select('id, nombre, email, rol, aprobado, canal_id, telefono, cuit_dni, condicion_fiscal, created_at, canales(slug, nombre)')
        .eq('id', clientId)
        .single()
      return data ?? { error: 'Cliente no encontrado' }
    }

    case 'get_sync_status': {
      const limit = Math.min((args.limit as number) ?? 5, 20)
      const { data } = await admin
        .from('sync_log')
        .select('tipo, registros, created_at')
        .order('created_at', { ascending: false })
        .limit(limit)
      return data ?? []
    }

    case 'get_categories_summary': {
      const { data } = await admin
        .from('productos')
        .select('categoria, stock')
        .eq('activo', true)

      const resumen: Record<string, { total: number; conStock: number; sinStock: number }> = {}
      for (const p of data ?? []) {
        const cat = p.categoria ?? 'Sin categoría'
        if (!resumen[cat]) resumen[cat] = { total: 0, conStock: 0, sinStock: 0 }
        resumen[cat].total++
        if ((p.stock ?? 0) > 0) resumen[cat].conStock++
        else resumen[cat].sinStock++
      }
      return resumen
    }

    case 'get_public_channel_status': {
      const categoria = args.categoria as string | undefined

      const { data: canal } = await admin.from('canales').select('id').eq('slug', 'publico').single()
      if (!canal) return { error: 'Canal público no encontrado' }

      const { data: publicas } = await admin.from('producto_canales').select('producto_id').eq('canal_id', canal.id)
      const idsPublicos = new Set((publicas ?? []).map(a => a.producto_id))

      let q = admin.from('productos').select('id, categoria').eq('activo', true)
      if (categoria) q = q.eq('categoria', categoria)

      const { data: productos } = await q

      const resumen: Record<string, { total: number; publicos: number }> = {}
      for (const p of productos ?? []) {
        const cat = p.categoria ?? 'Sin categoría'
        if (!resumen[cat]) resumen[cat] = { total: 0, publicos: 0 }
        resumen[cat].total++
        if (idsPublicos.has(p.id)) resumen[cat].publicos++
      }
      return resumen
    }

    default:
      return { error: `Tool desconocida: ${name}` }
  }
}
