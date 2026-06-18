import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Marca como inactivos a los clientes mayoristas cuya última compra (o fecha de alta)
  // supera el umbral configurado por canal. Una sola query JOIN en SQL.
  const { error } = await supabase.rpc('marcar_clientes_para_recontacto')

  if (error) {
    console.error('[cron/recontacto]', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
