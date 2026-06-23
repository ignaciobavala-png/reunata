'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'

export type CanalConfigPayload = {
  canal_id: number
  pagos_habilitados: Record<string, { activo: boolean }>
  cuotas_mp_sin_interes: number
  desc_transferencia_pct: number
  desc_efectivo_pct: number
  recargo_transf_blanco_pct: number
  desc_autogestion_primera_pct: number
  desc_autogestion_siguientes_pct: number
  envio_gratis_desde: number | null
  envio_flex_activo: boolean
  envio_amba_gratis_desde: number | null
  minimo_compra: number | null
  minimo_compra_trimestral: number | null
  dias_vencimiento_pedido: number
  mostrar_direccion_en_web: boolean
  direccion_negocio: string | null
  whatsapp_tipo: 'bot' | 'humano'
  premio_diversidad_items_min: number | null
  premio_diversidad_pct: number | null
  premio_monto_trimestral_min: number | null
  premio_monto_trimestral_pct: number | null
  premio_periodicidad_dias_max: number | null
  premio_periodicidad_pct: number | null
  marketing_dias_recontacto: number
  marketing_mensaje_recontacto: string
  marketing_link_agendamiento: string
}

export async function guardarCanalConfig(payload: CanalConfigPayload) {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('canales_config')
    .upsert(
      { ...payload, actualizado_en: new Date().toISOString() },
      { onConflict: 'canal_id' }
    )

  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/admin/canales')
  return { ok: true }
}
