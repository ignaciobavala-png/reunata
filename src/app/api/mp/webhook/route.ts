import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getMPPayment } from '@/lib/mercadopago'

const MP_ESTADO: Record<string, string> = {
  approved:    'pago_confirmado',
  rejected:    'cancelado',
  cancelled:   'cancelado',
}

export async function POST(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const topic = params.get('topic') ?? params.get('type')
  const rawId = params.get('id') ?? params.get('data.id')

  if (topic !== 'payment' || !rawId) return NextResponse.json({ ok: true })

  try {
    const payment = getMPPayment()
    const data = await payment.get({ id: rawId })

    const pedidoId = data.external_reference
    const status = data.status
    if (!pedidoId || !status) return NextResponse.json({ ok: true })

    const nuevoEstado = MP_ESTADO[status]
    if (!nuevoEstado) return NextResponse.json({ ok: true })

    const supabase = createServiceClient()
    await supabase
      .from('pedidos')
      .update({
        estado: nuevoEstado,
        mp_payment_id: String(data.id),
        ...(status === 'approved' ? { fecha_pago: new Date().toISOString() } : {}),
      })
      .eq('id', pedidoId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[mp/webhook]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
