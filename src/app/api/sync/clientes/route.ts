import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { esLlamadaDeServidor, esMasterDeSesion } from '@/lib/auth-servidor'

const GESU_BASE = process.env.GESU_API_BASE_URL!
const GESU_TOKEN = process.env.GESU_API_TOKEN!

if (!GESU_TOKEN) {
  console.error('[sync/clientes] GESU_API_TOKEN no configurada')
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface GesuCliente {
  relacion: string
  tipoPersona: string
  razonSocial: string
  categoriaPersona: string
  tipoDocumento: string
  nroDocumento: string
  condicionFiscal: string
  email: string
  listaPrecios: string
  bonificacionGeneral: number
  telefono?: string
  celular?: string
}

async function fetchPagina(pag: number): Promise<{ header: Record<string, number>; data: Record<string, GesuCliente> }> {
  const url = `${GESU_BASE}/api_clieprov.php?pag=${pag}&token=${GESU_TOKEN}`
  console.log('[sync/clientes] Fetching:', url.replace(GESU_TOKEN, '***'))
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) {
    const body = await res.text().catch(() => 'no body')
    console.error('[sync/clientes] Gesu devolvió', res.status, body)
    throw new Error(`Gesu devolvió ${res.status} en página ${pag}: ${body}`)
  }
  const json = await res.json()
  if (json.error) {
    console.error('[sync/clientes] Gesu error:', json.error)
    if (json.error.includes('2 veces por hora')) {
      throw new Error('Límite de GESU alcanzado: máximo 2 consultas por hora. Esperá y reintentá.')
    }
    throw new Error(`Gesu: ${json.error}`)
  }
  if (!json.header || !json.data) {
    console.error('[sync/clientes] Gesu estructura inesperada:', JSON.stringify(json).slice(0, 200))
    throw new Error('Gesu devolvió estructura inesperada')
  }
  return json
}

async function verificarAuth(request: Request): Promise<boolean> {
  if (esLlamadaDeServidor(request)) return true
  // Manual desde el panel: el rol sale de la sesión, nunca de un header del navegador
  if (await esMasterDeSesion()) return true

  console.warn('[sync/clientes] Auth fallida')
  return false
}

export async function GET(request: Request) {
  if (!await verificarAuth(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  return syncClientes()
}

export async function POST(request: Request) {
  if (!await verificarAuth(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  return syncClientes()
}

async function syncClientes() {

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
  let totalImportados = 0
  let error: string | null = null

  try {
    const todosLosClientes: GesuCliente[] = []
    let pag = 1

    while (true) {
      const { header, data } = await fetchPagina(pag)
      // Solo importar Clientes, no Proveedores
      const soloClientes = Object.values(data).filter(c => c.relacion === 'Cliente')
      todosLosClientes.push(...soloClientes)

      if (header.data_fin >= header.data_tot) break
      pag++
    }

    // Solo guardamos metadatos de clientes Gesu en sync_log — no creamos auth users.
    // Los clientes se registran solos en la web y el master les asigna lista/canal.
    // Esta sync sirve para que el master pueda consultar qué clientes existen en Gesu
    // y pre-cargar sus datos si lo desea (futura feature).
    totalImportados = todosLosClientes.length

  } catch (e) {
    error = (e as Error).message
  }

  await supabase.from('sync_log').insert({
    tipo: 'clientes',
    estado: error ? 'error' : 'ok',
    registros: totalImportados,
    mensaje: error ?? `Sync OK: ${totalImportados} clientes en Gesu (en ${Date.now() - inicio}ms)`,
  })

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ ok: true, registros: totalImportados, ms: Date.now() - inicio })
}
