import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { consultarEnvioEnviopack } from '@/lib/enviopack'

// Webhook de Enviopack — GET con ?tipo=envio-procesado|envio-cambio-condicion&id=<envioId>
// Llega SIN firma: no se confía en el ping, se consulta el estado real a la API.
// Hay que responder 200 en <5s; Enviopack reintenta hasta 10 veces si no.
// Registrar la URL en app.enviopack.com/configuracion/integraciones (una sola vez):
//   https://<dominio>/api/envio/webhook
export async function GET(req: Request) {
  const url = new URL(req.url)
  const tipo = url.searchParams.get('tipo')
  const id = url.searchParams.get('id')

  // Siempre 200: un error nuestro no debe hacer reintentar a Enviopack para siempre.
  if (!tipo || !id) return NextResponse.json({ ok: true })

  try {
    const envio = await consultarEnvioEnviopack(id)
    if (!envio.ok) {
      console.error('[enviopack webhook] no se pudo verificar el envío', id, envio.error)
      return NextResponse.json({ ok: true })
    }

    const nuevoEstado = envio.procesado
      ? 'procesado'
      : envio.confirmado
        ? 'en_proceso'
        : 'sin_confirmar'

    const service = createServiceClient()
    const { data, error } = await service
      .from('pedidos')
      .update({
        enviopack_estado: nuevoEstado,
        ...(envio.trackingNumber ? { tracking: envio.trackingNumber } : {}),
      })
      .eq('enviopack_envio_id', id)
      .select('numero')

    if (error) {
      console.error('[enviopack webhook] error actualizando pedido:', error.message)
    } else if (!data?.length) {
      console.warn('[enviopack webhook] ningún pedido con enviopack_envio_id =', id)
    } else {
      console.log(`[enviopack webhook] pedido #${data[0].numero} → ${nuevoEstado} (tipo=${tipo}, tracking=${envio.trackingNumber ?? '—'})`)
    }
  } catch (e) {
    console.error('[enviopack webhook] error inesperado:', e)
  }

  return NextResponse.json({ ok: true })
}
