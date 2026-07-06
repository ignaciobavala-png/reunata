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

  const ahora = new Date().toISOString()

  // Transferencia vencida → borrador (el cliente puede retomarla con precios actualizados)
  const { data: revertidos, error: errRevertir } = await supabase
    .from('pedidos')
    .update({ estado: 'borrador', editable: true, expira_en: null })
    .eq('estado', 'pendiente_pago')
    .eq('medio_pago', 'transferencia')
    .lt('expira_en', ahora)
    .not('expira_en', 'is', null)
    .select('id')

  if (errRevertir) {
    console.error('[pedidos/limpiar] revertir transferencia:', errRevertir)
    return NextResponse.json({ ok: false, error: errRevertir.message }, { status: 500 })
  }

  // MP vencido → cancelado (la preferencia de MP ya no sirve)
  const { data: cancelados, error: errCancelar } = await supabase
    .from('pedidos')
    .update({ estado: 'cancelado', editable: false })
    .eq('estado', 'pendiente_pago')
    .eq('medio_pago', 'mercadopago')
    .lt('expira_en', ahora)
    .not('expira_en', 'is', null)
    .select('id')

  if (errCancelar) {
    console.error('[pedidos/limpiar] cancelar mp:', errCancelar)
    return NextResponse.json({ ok: false, error: errCancelar.message }, { status: 500 })
  }

  // Borradores sin comprobante vencidos → cancelar (1 semana sin completar)
  const { data: borradoresCancelados, error: errBorradores } = await supabase
    .from('pedidos')
    .update({ estado: 'cancelado', editable: false })
    .eq('estado', 'borrador')
    .lt('expira_en', ahora)
    .not('expira_en', 'is', null)
    .select('id')

  if (errBorradores) {
    console.error('[pedidos/limpiar] cancelar borradores:', errBorradores)
    return NextResponse.json({ ok: false, error: errBorradores.message }, { status: 500 })
  }

  console.log(`[pedidos/limpiar] Revertidos: ${revertidos?.length ?? 0} transferencia | Cancelados: ${cancelados?.length ?? 0} mp | Borradores vencidos: ${borradoresCancelados?.length ?? 0}`)
  return NextResponse.json({ ok: true, revertidos: revertidos?.length ?? 0, cancelados: cancelados?.length ?? 0, borradores: borradoresCancelados?.length ?? 0 })
}
