import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import { estadoLabel, ESTADOS_FINALIZADOS } from '@/lib/estadosPedido'

function periodoToRange(periodo: string | undefined): { desde?: string; hasta?: string } {
  if (!periodo) return {}
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')

  if (periodo === 'hoy') {
    const d = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    return { desde: `${d}T00:00:00`, hasta: `${d}T23:59:59` }
  }
  if (periodo === 'semana') {
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const lunes = new Date(now)
    lunes.setDate(diff)
    const d = `${lunes.getFullYear()}-${pad(lunes.getMonth() + 1)}-${pad(lunes.getDate())}`
    return { desde: `${d}T00:00:00` }
  }
  if (periodo === 'mes') {
    const d = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`
    return { desde: `${d}T00:00:00` }
  }
  if (periodo === 'anio') {
    return { desde: `${now.getFullYear()}-01-01T00:00:00` }
  }
  return {}
}

export async function GET(request: NextRequest) {
  const sp      = request.nextUrl.searchParams
  const estado  = sp.get('estado') ?? undefined
  const q       = sp.get('q')?.trim() ?? ''
  const periodo = sp.get('periodo') ?? undefined
  const bandeja = sp.get('bandeja') ?? undefined

  const supabase = createServiceClient()
  const { desde, hasta } = periodoToRange(periodo)

  let matchingClienteIds: string[] = []
  if (q && !/^\d+$/.test(q)) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .or(`nombre.ilike.%${q}%,email.ilike.%${q}%`)
    matchingClienteIds = (profiles ?? []).map(p => p.id)
  }

  let query = supabase
    .from('pedidos')
    .select(`
      id, numero, estado, medio_pago, total_usd, created_at, cliente_id,
      guest_nombre, guest_email,
      cliente:cliente_id ( nombre, email )
    `)
    .order('created_at', { ascending: false })
    .limit(5000)

  if (bandeja === 'proceso')     query = query.not('estado', 'in', `(${ESTADOS_FINALIZADOS.join(',')})`)
  if (bandeja === 'finalizados') query = query.in('estado', ESTADOS_FINALIZADOS)
  if (estado) query = query.eq('estado', estado)
  if (desde)  query = query.gte('created_at', desde)
  if (hasta)  query = query.lte('created_at', hasta)

  if (q) {
    if (/^\d+$/.test(q)) {
      query = query.eq('numero', parseInt(q))
    } else {
      let orFilter = `guest_nombre.ilike.%${q}%,guest_email.ilike.%${q}%`
      if (matchingClienteIds.length > 0) {
        orFilter += `,cliente_id.in.(${matchingClienteIds.join(',')})`
      }
      query = query.or(orFilter)
    }
  }

  const { data: pedidos, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (pedidos ?? []).map(p => {
    const cliente = p.cliente as { nombre?: string; email?: string } | null
    return {
      'Nº Pedido':    `#${p.numero}`,
      'Cliente':      cliente?.nombre || (p as any).guest_nombre || '—',
      'Email':        cliente?.email  || (p as any).guest_email  || '—',
      'Tipo':         cliente ? 'Registrado' : 'No registrado',
      'Estado':       estadoLabel(p.estado),
      'Medio de pago': p.medio_pago?.replace(/_/g, ' ') ?? '—',
      'Total':        p.total_usd != null ? Number(p.total_usd) : null,
      'Fecha':        new Date(p.created_at).toLocaleDateString('es-AR'),
    }
  })

  const ws = XLSX.utils.json_to_sheet(rows)

  // Ancho de columnas
  ws['!cols'] = [
    { wch: 12 },  // Nº Pedido
    { wch: 28 },  // Cliente
    { wch: 32 },  // Email
    { wch: 14 },  // Tipo
    { wch: 22 },  // Estado
    { wch: 18 },  // Medio de pago
    { wch: 12 },  // Total
    { wch: 14 },  // Fecha
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Pedidos')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const filename = `pedidos_${stamp}.xlsx`

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'x-filename': filename,
    },
  })
}
