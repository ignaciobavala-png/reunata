import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { getMPPayment } from '@/lib/mercadopago'

const MP_ESTADO: Record<string, string> = {
  approved:  'pago_confirmado',
  rejected:  'cancelado',
  cancelled: 'cancelado',
}

function verificarFirma(req: NextRequest, rawBody: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) {
    console.warn('[mp/webhook] MP_WEBHOOK_SECRET no configurado — omitiendo verificación de firma')
    return true
  }

  const xSignature  = req.headers.get('x-signature') ?? ''
  const xRequestId  = req.headers.get('x-request-id') ?? ''
  const ts          = xSignature.match(/ts=([^,]+)/)?.[1] ?? ''
  const v1          = xSignature.match(/v1=([^,]+)/)?.[1] ?? ''

  if (!ts || !v1) return false

  // MP firma: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
  const dataId = req.nextUrl.searchParams.get('data.id') ?? ''
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const expected = createHmac('sha256', secret).update(manifest).digest('hex')

  return expected === v1
}

export async function POST(req: NextRequest) {
  // MP v2 envía datos en el body JSON; v1 IPN los manda en query params
  let body: { type?: string; action?: string; data?: { id?: string } } = {}
  try {
    body = await req.clone().json()
  } catch {
    // body vacío o no-JSON → IPN v1, usamos query params
  }

  const topic = body.type ?? body.action
    ?? req.nextUrl.searchParams.get('topic')
    ?? req.nextUrl.searchParams.get('type')

  const rawId = body.data?.id
    ?? req.nextUrl.searchParams.get('id')
    ?? req.nextUrl.searchParams.get('data.id')

  if (topic !== 'payment' || !rawId) return NextResponse.json({ ok: true })

  if (!verificarFirma(req, await req.text().catch(() => ''))) {
    console.error('[mp/webhook] Firma inválida')
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  try {
    const payment = getMPPayment()
    const data = await payment.get({ id: rawId })

    const pedidoId = data.external_reference
    const status   = data.status
    if (!pedidoId || !status) return NextResponse.json({ ok: true })

    const nuevoEstado = MP_ESTADO[status]
    if (!nuevoEstado) return NextResponse.json({ ok: true })

    const supabase = createServiceClient()

    // Verificar estado actual para idempotencia de fecha_pago (#15)
    const { data: pedidoActual } = await supabase
      .from('pedidos')
      .select('estado')
      .eq('id', pedidoId)
      .single()

    const yaConfirmado = pedidoActual?.estado === 'pago_confirmado'

    // MP puede reintentar notificaciones o entregarlas fuera de orden: un evento
    // rejected/cancelled tardío nunca debe pisar un pago ya confirmado.
    if (yaConfirmado && nuevoEstado !== 'pago_confirmado') {
      return NextResponse.json({ ok: true })
    }

    const { data: pedidoActualizado } = await supabase
      .from('pedidos')
      .update({
        estado: nuevoEstado,
        editable: false,
        mp_payment_id: String(data.id),
        ...(status === 'approved' && !yaConfirmado
          ? { fecha_pago: new Date().toISOString() }
          : {}),
      })
      .eq('id', pedidoId)
      .select('cliente_id')
      .single()

    if (status === 'approved' && pedidoActualizado?.cliente_id) {
      await supabase
        .from('profiles')
        .update({ ultima_compra_en: new Date().toISOString(), requiere_recontacto: false })
        .eq('id', pedidoActualizado.cliente_id)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[mp/webhook]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
