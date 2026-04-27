'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'

export async function guardarConfiguracion(formData: FormData) {
  const supabase = createServiceClient()

  const claves = [
    'banco_cbu', 'banco_alias', 'banco_nombre',
    'banco_razon_social', 'banco_cuit',
    'pedido_monto_minimo', 'pedido_dias_vencimiento',
  ]

  const rows = claves.map(clave => ({
    clave,
    valor: (formData.get(clave) as string) ?? '',
  }))

  const { error } = await supabase.from('configuracion').upsert(rows, { onConflict: 'clave' })
  if (error) throw new Error(`Error al guardar configuración: ${error.message}`)
  revalidatePath('/dashboard/admin/configuracion')
}
