import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resolverCanalTienda } from '@/lib/tienda'

export async function GET() {
  const { canalId } = await resolverCanalTienda()

  if (!canalId) return NextResponse.json({ reglas: null })

  const service = createServiceClient()
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  const [{ data }, { count }] = await Promise.all([
    service
      .from('canales_config')
      .select(
        'pagos_habilitados, minimo_compra, desc_efectivo_pct, desc_transferencia_pct, ' +
        'recargo_transf_blanco_pct, desc_autogestion_primera_pct, desc_autogestion_siguientes_pct, ' +
        'envio_gratis_desde, envio_amba_gratis_desde, cuotas_mp_sin_interes, dias_vencimiento_pedido, ' +
        'envio_flex_activo, mostrar_direccion_en_web, whatsapp_tipo, direccion_negocio'
      )
      .eq('canal_id', canalId)
      .maybeSingle(),
    user
      ? service
          .from('pedidos')
          .select('id', { count: 'exact', head: true })
          .eq('cliente_id', user.id)
          .neq('estado', 'cancelado')
      : Promise.resolve({ count: 0 }),
  ])

  const reglas = data
    ? { ...(data as unknown as Record<string, unknown>), es_primera_compra: (count ?? 0) === 0 }
    : null
  return NextResponse.json({ reglas })
}
