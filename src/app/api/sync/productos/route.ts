import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

const GESU_BASE = process.env.GESU_API_BASE_URL!
const GESU_TOKEN = process.env.GESU_API_TOKEN!
const SYNC_SECRET = process.env.SYNC_SECRET!

if (!GESU_TOKEN) {
  console.error('[sync/productos] GESU_API_TOKEN no configurada')
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface GesuItem {
  tipo: string
  titulo: string
  codigoInterno: string
  codigoBarras: string
  codigoProveedor: string
  categoria: string
  subCategoria: string
  marca: string
  proveedor: string
  ubicacionInterna: string
  stock: number | null
  StockVariante: string
  stockMinimo: number
  monedaPrecioCompra: string
  precioFinalCompra: number
  monedaPrecioLista1: string
  precioFinalLista1: number
  monedaPrecioLista2: string
  precioFinalLista2: number
  monedaPrecioLista3: string
  precioFinalLista3: number
  monedaPrecioLista4: string
  precioFinalLista4: number
  monedaPrecioLista5: string
  precioFinalLista5: number
  iva: number
  descripcion: string | null
  palabrasClave: string
}

function parseStockVariante(raw: string): { nombre: string; stock: number }[] | null {
  if (!raw?.trim()) return null
  try {
    return raw.split(';').map(entry => {
      const colonIdx = entry.lastIndexOf(':')
      const nombre = entry.slice(0, colonIdx).trim()
      const stock = parseFloat(entry.slice(colonIdx + 1))
      return { nombre, stock: isNaN(stock) ? 0 : stock }
    }).filter(v => v.nombre)
  } catch {
    return null
  }
}

async function fetchPagina(pag: number): Promise<{ header: Record<string, number>; data: Record<string, GesuItem> }> {
  const url = `${GESU_BASE}/api_items.php?pag=${pag}&token=${GESU_TOKEN}`
  console.log('[sync/productos] Fetching:', url.replace(GESU_TOKEN, '***'))
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) {
    const body = await res.text().catch(() => 'no body')
    console.error('[sync/productos] Gesu devolvió', res.status, body)
    throw new Error(`Gesu devolvió ${res.status} en página ${pag}: ${body}`)
  }
  const json = await res.json()
  if (json.error) {
    console.error('[sync/productos] Gesu error:', json.error)
    if (json.error.includes('2 veces por hora')) {
      throw new Error('Límite de GESU alcanzado: máximo 2 consultas por hora. Esperá y reintentá.')
    }
    throw new Error(`Gesu: ${json.error}`)
  }
  if (!json.header || !json.data) {
    console.error('[sync/productos] Gesu estructura inesperada:', JSON.stringify(json).slice(0, 200))
    throw new Error('Gesu devolvió estructura inesperada')
  }
  return json
}

async function verificarAuth(request: Request): Promise<boolean> {
  // Manual desde el dashboard via X-Is-Master (seteado por server component)
  if (request.headers.get('X-Is-Master') === 'true') return true

  // Vercel Cron envía x-vercel-cron automáticamente
  if (request.headers.get('x-vercel-cron')) return true

  // Cron de Vercel o server-to-server con CRON_SECRET o SYNC_SECRET
  const auth = request.headers.get('authorization')
  if (process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) return true
  if (SYNC_SECRET && auth === `Bearer ${SYNC_SECRET}`) return true

  console.warn('[sync/productos] Auth fallida - headers:', {
    'x-is-master': request.headers.get('X-Is-Master'),
    'x-vercel-cron': request.headers.get('x-vercel-cron'),
    hasAuth: !!auth,
    hasCronSecret: !!process.env.CRON_SECRET,
    hasSyncSecret: !!SYNC_SECRET,
  })

  return false
}

export async function GET(request: Request) {
  if (!await verificarAuth(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  return syncProductos(request.headers.get('X-Desactivar-No-Reunata') === 'true')
}

export async function POST(request: Request) {
  if (!await verificarAuth(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  return syncProductos(request.headers.get('X-Desactivar-No-Reunata') === 'true')
}

async function syncProductos(desactivarNoReunata = false) {

  if (!GESU_TOKEN) {
    return NextResponse.json(
      { ok: false, error: 'GESU_API_TOKEN no configurada. Revisa las variables de entorno en Vercel.' },
      { status: 500 }
    )
  }

  if (!GESU_BASE) {
    return NextResponse.json(
      { ok: false, error: 'GESU_API_BASE_URL no configurada. Revisa las variables de entorno en Vercel.' },
      { status: 500 }
    )
  }

  const inicio = Date.now()
  let totalUpserted = 0
  let totalDesactivados = 0
  let error: string | null = null

  try {
    // Traer todos los items (paginando)
    const todosLosItems: GesuItem[] = []
    let pag = 1

    while (true) {
      const { header, data } = await fetchPagina(pag)
      todosLosItems.push(...Object.values(data))

      const finRango = header.data_fin
      const totalItems = header.data_tot
      if (finRango >= totalItems) break
      pag++
    }

    // Deduplicar por codigo_interno (Gesu puede tener duplicados)
    const vistos = new Set<string>()
    const sinDuplicados = todosLosItems.filter(item => {
      if (!item.codigoInterno || vistos.has(item.codigoInterno)) return false
      vistos.add(item.codigoInterno)
      return true
    })

    // Filtrar solo productos de Reunata, excluyendo categorías internas de gestión
    const CATEGORIAS_INTERNAS = /^[MO]\)|preventa|productos en desarrollo|productos importados|bienes de uso/i
    const soloReunata = sinDuplicados.filter(item =>
      item.marca?.toLowerCase().includes('reunata') &&
      item.categoria &&
      !CATEGORIAS_INTERNAS.test(item.categoria)
    )

    // Transformar y hacer upsert por lotes de 100
    const num = (v: unknown) => { const n = Number(v); return isNaN(n) || v === '' ? null : n }
    const int = (v: unknown) => { const n = parseInt(String(v)); return isNaN(n) ? null : n }

    const rows = soloReunata.map((item) => ({
      codigo_interno:  item.codigoInterno || null,
      codigo_barras:   item.codigoBarras || null,
      tipo:            item.tipo || null,
      titulo:          item.titulo,
      categoria:       item.categoria || null,
      sub_categoria:   item.subCategoria || null,
      marca:           item.marca || null,
      proveedor:       item.proveedor || null,
      stock:           int(item.stock),
      stock_minimo:    int(item.stockMinimo),
      moneda:          item.monedaPrecioLista1 || item.monedaPrecioLista5 || '$',
      precio_compra:   num(item.precioFinalCompra),
      precio_lista1:   num(item.precioFinalLista1),
      precio_lista2:   num(item.precioFinalLista2),
      precio_lista3:   num(item.precioFinalLista3),
      precio_lista4:   num(item.precioFinalLista4),
      precio_lista5:   num(item.precioFinalLista5),
      iva:             num(item.iva) ?? 0,
      descripcion:     item.descripcion || null,
      palabras_clave:  item.palabrasClave || null,
      variantes:       parseStockVariante(item.StockVariante),
      ultima_sync:     new Date().toISOString(),
      activo:          true,
    }))

    const BATCH = 100
    for (let i = 0; i < rows.length; i += BATCH) {
      const { error: upsertError } = await supabase
        .from('productos')
        .upsert(rows.slice(i, i + BATCH), { onConflict: 'codigo_interno' })

      if (upsertError) throw new Error(upsertError.message)
      totalUpserted += Math.min(BATCH, rows.length - i)
    }

    // Desactivar productos que ya no son de Reunata (opcional, controlado desde el panel)
    if (desactivarNoReunata) {
      const codigosReunata = soloReunata.map(item => item.codigoInterno).filter(Boolean) as string[]
      if (codigosReunata.length > 0) {
        const { count } = await supabase
          .from('productos')
          .update({ activo: false }, { count: 'exact' })
          .not('codigo_interno', 'in', `(${codigosReunata.join(',')})`)
        totalDesactivados = count ?? 0
      }
    }

    // Sincronizar categorias_home con las categorías de Gesu
    const categoriasGesu = [...new Set(soloReunata.map(item => item.categoria).filter(Boolean))] as string[]
    const { data: filasExistentes } = await supabase.from('categorias_home').select('id, nombre, href, categoria_keys, activo')
    // Solo contar keys de categorías activas — las inactivas liberan sus keys
    const keysAsignadas = new Set(
      (filasExistentes ?? []).filter(f => f.activo).flatMap(f => (f.categoria_keys ?? []) as string[])
    )

    // Crear nuevas categorías con activo: true (Gesu es la fuente de verdad)
    for (const cat of categoriasGesu.filter(cat => !keysAsignadas.has(cat))) {
      await supabase.from('categorias_home').insert({
        nombre: cat,
        href: `/tienda/${slugify(cat)}`,
        categoria_keys: [cat],
        activo: true,
        orden: 999,
      })
    }

    // Parchear filas existentes sin href
    for (const fila of (filasExistentes ?? []).filter(f => !f.href)) {
      await supabase.from('categorias_home').update({ href: `/tienda/${slugify(fila.nombre)}` }).eq('id', fila.id)
    }

    // Auto-desactivar categorías cuyas categoria_keys ya no tienen productos activos en Gesu
    for (const fila of (filasExistentes ?? []).filter(f => f.activo)) {
      const keys = (fila.categoria_keys ?? []) as string[]
      const tieneProductos = keys.some(k => categoriasGesu.includes(k))
      if (!tieneProductos) {
        await supabase.from('categorias_home').update({ activo: false }).eq('id', fila.id)
      }
    }

  } catch (e) {
    error = (e as Error).message
    console.error('[sync/productos] Error:', error)
  }

  // Registrar en sync_log
  await supabase.from('sync_log').insert({
    tipo: 'productos',
    estado: error ? 'error' : 'ok',
    registros: totalUpserted,
    mensaje: error ?? `Sync OK en ${Date.now() - inicio}ms`,
  })

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, registros: totalUpserted, desactivados: totalDesactivados, ms: Date.now() - inicio })
}
