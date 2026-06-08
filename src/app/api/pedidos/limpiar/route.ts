import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const SYNC_SECRET = process.env.SYNC_SECRET

function autorizado(req: NextRequest): boolean {
  if (req.headers.get('x-vercel-cron')) return true
  const auth = req.headers.get('authorization')
  if (SYNC_SECRET && auth === `Bearer ${SYNC_SECRET}`) return true
  return false
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('pedidos')
    .update({ estado: 'cancelado' })
    .eq('estado', 'pendiente_pago')
    .lt('expira_en', new Date().toISOString())
    .not('expira_en', 'is', null)
    .select('id')

  if (error) {
    console.error('[pedidos/limpiar]', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  console.log(`[pedidos/limpiar] Cancelados: ${data?.length ?? 0} pedidos vencidos`)
  return NextResponse.json({ ok: true, cancelados: data?.length ?? 0 })
}
