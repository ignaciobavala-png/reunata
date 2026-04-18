'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function guardarConfiguracion(formData: FormData) {
  const supabase = await createClient()

  const claves = [
    'banco_cbu', 'banco_alias', 'banco_nombre',
    'banco_razon_social', 'banco_cuit',
    'pedido_monto_minimo', 'pedido_dias_vencimiento',
  ]

  const rows = claves.map(clave => ({
    clave,
    valor: (formData.get(clave) as string) ?? '',
  }))

  await supabase.from('configuracion').upsert(rows, { onConflict: 'clave' })
  revalidatePath('/dashboard/admin/configuracion')
}
