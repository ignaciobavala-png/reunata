'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'

export type CanalConfigPayload = {
  canal_id: number
  cuenta_sin_iva_id?: number | null
  pagos_habilitados: Record<string, { activo: boolean }>
  cuotas_mp_sin_interes: number
  desc_transferencia_pct: number
  desc_efectivo_pct: number
  recargo_transf_blanco_pct: number
  recargo_echeq_al_dia_pct: number
  recargo_cheque_al_dia_pct: number
  recargo_echeq_propio_pct: number
  desc_autogestion_primera_pct: number
  desc_autogestion_siguientes_pct: number
  desc_volumen_monto_min: number | null
  desc_volumen_pct: number | null
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
  // La DB exige ambos campos o ninguno (CHECK); validar acá para dar un error legible
  if ((payload.desc_volumen_monto_min != null) !== (payload.desc_volumen_pct != null)) {
    return { ok: false, error: 'Descuento por volumen: completá el monto mínimo y el porcentaje, o dejá ambos vacíos.' }
  }

  const supabase = createServiceClient()

  // Separar cuenta_sin_iva_id — va en canales, no en canales_config
  const { cuenta_sin_iva_id, ...configPayload } = payload

  const [configResult, canalResult] = await Promise.all([
    supabase
      .from('canales_config')
      .upsert(
        { ...configPayload, actualizado_en: new Date().toISOString() },
        { onConflict: 'canal_id' }
      ),
    cuenta_sin_iva_id !== undefined
      ? supabase
          .from('canales')
          .update({ cuenta_sin_iva_id: cuenta_sin_iva_id ?? null })
          .eq('id', payload.canal_id)
      : Promise.resolve({ error: null }),
  ])

  if (configResult.error) return { ok: false, error: configResult.error.message }
  if (canalResult.error) return { ok: false, error: canalResult.error.message }

  revalidatePath('/dashboard/admin/canales')
  revalidatePath('/dashboard/admin/productos')
  return { ok: true }
}
