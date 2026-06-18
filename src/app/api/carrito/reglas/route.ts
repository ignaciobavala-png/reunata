import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { resolverCanalTienda } from '@/lib/tienda'

export async function GET() {
  const { canalId } = await resolverCanalTienda()

  if (!canalId) return NextResponse.json({ reglas: null })

  const service = createServiceClient()
  const { data } = await service
    .from('canales_config')
    .select(
      'pagos_habilitados, minimo_compra, desc_efectivo_pct, desc_transferencia_pct, ' +
      'recargo_transf_blanco_pct, desc_autogestion_primera_pct, desc_autogestion_siguientes_pct, ' +
      'envio_gratis_desde, envio_amba_gratis_desde'
    )
    .eq('canal_id', canalId)
    .maybeSingle()

  return NextResponse.json({ reglas: data ?? null })
}
