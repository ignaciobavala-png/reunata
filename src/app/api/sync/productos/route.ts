import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const GESU_BASE = process.env.GESU_API_BASE_URL!
const GESU_TOKEN = process.env.GESU_API_TOKEN!
const SYNC_SECRET = process.env.SYNC_SECRET!

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface GesuItem {
  tipo: string
  titulo: string
  codigoInterno: string
  codigoBarras: string
  categoria: string
  subCategoria: string
  marca: string
  proveedor: string
  stock: number | null
  stockMinimo: number
  monedaPrecioCompra: string
  precioFinalCompra: number
  precioFinalLista1: number
  precioFinalLista2: number
  precioFinalLista3: number
  precioFinalLista4: number
  precioFinalLista5: number
  iva: number
  descripcion: string | null
  palabrasClave: string
}

async function fetchPagina(pag: number): Promise<{ header: Record<string, number>; data: Record<string, GesuItem> }> {
  const url = `${GESU_BASE}/api_items.php?pag=${pag}&token=${GESU_TOKEN}`
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`Gesu devolvió ${res.status} en página ${pag}`)
  const json = await res.json()
  if (json.error) throw new Error(`Gesu: ${json.error}`)
  if (!json.header || !json.data) throw new Error('Gesu devolvió estructura inesperada')
  return json
}

async function verificarAuth(request: Request): Promise<boolean> {
  // Manual desde el dashboard via X-Is-Master (seteado por server component)
  if (request.headers.get('X-Is-Master') === 'true') return true

  // Cron de Vercel o server-to-server con CRON_SECRET o SYNC_SECRET
  const auth = request.headers.get('authorization')
  if (process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) return true
  if (SYNC_SECRET && auth === `Bearer ${SYNC_SECRET}`) return true

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

  const inicio = Date.now()
  let totalUpserted = 0
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

    // Transformar y hacer upsert por lotes de 100
    const num = (v: unknown) => { const n = Number(v); return isNaN(n) || v === '' ? null : n }
    const int = (v: unknown) => { const n = parseInt(String(v)); return isNaN(n) ? null : n }

    const rows = sinDuplicados.map((item) => ({
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
      moneda:          item.monedaPrecioCompra || 'u$s',
      precio_compra:   num(item.precioFinalCompra),
      precio_lista1:   num(item.precioFinalLista1),
      precio_lista2:   num(item.precioFinalLista2),
      precio_lista3:   num(item.precioFinalLista3),
      precio_lista4:   num(item.precioFinalLista4),
      precio_lista5:   num(item.precioFinalLista5),
      iva:             num(item.iva) ?? 0,
      descripcion:     item.descripcion || null,
      palabras_clave:  item.palabrasClave || null,
      ultima_sync:     new Date().toISOString(),
    }))

    const BATCH = 100
    for (let i = 0; i < rows.length; i += BATCH) {
      const { error: upsertError } = await supabase
        .from('productos')
        .upsert(rows.slice(i, i + BATCH), { onConflict: 'codigo_interno' })

      if (upsertError) throw new Error(upsertError.message)
      totalUpserted += Math.min(BATCH, rows.length - i)
    }
  } catch (e) {
    error = (e as Error).message
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

  return NextResponse.json({ ok: true, registros: totalUpserted, ms: Date.now() - inicio })
}
