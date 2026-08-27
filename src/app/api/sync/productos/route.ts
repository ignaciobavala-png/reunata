import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { CATEGORIAS_INTERNAS } from '@/lib/gesu'

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
    const result = raw.split(';').map(entry => {
      const colonIdx = entry.lastIndexOf(':')
      const nombre = entry.slice(0, colonIdx).trim()
      const stock = parseFloat(entry.slice(colonIdx + 1))
      return { nombre, stock: isNaN(stock) ? 0 : stock }
    }).filter(v => v.nombre)
    return result.length > 0 ? result : null
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
  return syncProductos()
}

export async function POST(request: Request) {
  if (!await verificarAuth(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  return syncProductos()
}

async function syncProductos() {

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
  const avisos: string[] = []
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
    const soloReunata = sinDuplicados.filter(item =>
      item.marca?.toLowerCase().includes('reunata') &&
      item.categoria &&
      !CATEGORIAS_INTERNAS.test(item.categoria)
    )

    // Transformar y hacer upsert por lotes de 100
    // Una sola marca de tiempo para toda la corrida: las filas que queden con
    // ultima_sync anterior a esta marca son las que Gesu ya no manda (o que
    // dejaron de pasar el filtro) y hay que desactivar.
    const marcaSync = new Date().toISOString()

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
      // La descripción NO se sincroniza desde Gesu: la página es la única fuente
      // de verdad y se carga a mano desde el panel. Traerla acá la pisaría en cada
      // sync. (upsert solo escribe las columnas presentes, así que omitirla deja
      // intacto lo cargado a mano.)
      palabras_clave:  item.palabrasClave || null,
      variantes:       parseStockVariante(item.StockVariante),
      ultima_sync:     marcaSync,
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

    // Desactivar lo que esta corrida NO trajo.
    //
    // El filtro de arriba (marca Reunata + categoria no interna) decide qué entra
    // al upsert, pero antes NO había nada que sacara de la web lo que dejaba de
    // entrar: la fila vieja quedaba congelada con el título y la categoría de la
    // última vez que sí pasó, y activo = true. Ese era el bug reportado el 27/08
    // (item pasado a "Preventa" en Gesu que seguía publicado en Mates y Yerberas
    // con el nombre viejo).
    //
    // Se compara contra ultima_sync en vez de mandar la lista de códigos: una sola
    // query, sin armar un IN con miles de valores sin escapar. Las filas con
    // ultima_sync null quedan afuera a propósito — nunca vinieron de Gesu.
    if (rows.length > 0) {
      // count exacto aparte de la muestra: el select de PostgREST viene topeado por
      // Max Rows y con >1000 filas el largo del array mentiría (ver skill
      // supabase-max-rows-limit).
      const { count: cuantos } = await supabase
        .from('productos')
        .select('id', { count: 'exact', head: true })
        .eq('activo', true)
        .lt('ultima_sync', marcaSync)

      const aDesactivarCount = cuantos ?? 0

      const { data: muestra } = await supabase
        .from('productos')
        .select('codigo_interno, titulo')
        .eq('activo', true)
        .lt('ultima_sync', marcaSync)
        .limit(30)

      const candidatos = muestra ?? []

      // Guarda: si Gesu devuelve un catálogo parcial sin tirar error, esto vaciaría
      // la tienda. Si hay que desactivar más de la mitad de lo activo, no se toca
      // nada y queda registrado para revisarlo a mano.
      const totalActivos = aDesactivarCount + rows.length
      if (aDesactivarCount > totalActivos / 2) {
        avisos.push(`Desactivación omitida: ${aDesactivarCount} de ${totalActivos} productos activos quedaron fuera del sync (posible catálogo parcial de Gesu). Revisar a mano.`)
        console.error('[sync/productos] Desactivación omitida por volumen sospechoso:', aDesactivarCount, 'de', totalActivos)
      } else if (aDesactivarCount > 0) {
        const { error: desactivarError } = await supabase
          .from('productos')
          .update({ activo: false })
          .eq('activo', true)
          .lt('ultima_sync', marcaSync)

        if (desactivarError) throw new Error(desactivarError.message)
        totalDesactivados = aDesactivarCount

        console.warn(
          '[sync/productos] Desactivados por no venir en el sync:',
          candidatos.map(p => `${p.codigo_interno} (${p.titulo})`).join(', ')
        )
        avisos.push(
          `Desactivados ${totalDesactivados}: ` +
          candidatos.map(p => p.codigo_interno).join(', ') +
          (aDesactivarCount > candidatos.length ? `, +${aDesactivarCount - candidatos.length} más` : '')
        )
      }
    }

    // categorias_home es una lista fija curada a mano (Gastón define qué categorías
    // se muestran). El sync NO crea ni desactiva categorías automáticamente: eso fue
    // lo que generó duplicados en cada corrida cuando Gesu mandaba una variante de
    // nombre (mayúscula/tilde/espacio) que no matcheaba el string guardado.
    // Acá solo se parchea el href si falta y se loguean categorías de Gesu que no
    // están mapeadas a ninguna fila activa, para agregarlas a mano si corresponde.
    const categoriasGesu = [...new Set(soloReunata.map(item => item.categoria).filter(Boolean))] as string[]
    const { data: filasExistentes } = await supabase.from('categorias_home').select('id, nombre, href, categoria_keys, activo')

    for (const fila of (filasExistentes ?? []).filter(f => !f.href)) {
      await supabase.from('categorias_home').update({ href: `/tienda/${slugify(fila.nombre)}` }).eq('id', fila.id)
    }

    const keysAsignadas = new Set(
      (filasExistentes ?? []).filter(f => f.activo).flatMap(f => (f.categoria_keys ?? []) as string[])
    )
    const categoriasSinMapear = categoriasGesu.filter(cat => !keysAsignadas.has(cat))
    if (categoriasSinMapear.length > 0) {
      console.warn('[sync/productos] Categorías de Gesu sin mapear en categorias_home:', categoriasSinMapear)
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
    mensaje: error ?? [`Sync OK en ${Date.now() - inicio}ms`, ...avisos].join(' | ').slice(0, 4000),
  })

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, registros: totalUpserted, desactivados: totalDesactivados, avisos, ms: Date.now() - inicio })
}
