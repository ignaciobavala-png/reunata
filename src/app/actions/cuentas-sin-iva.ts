'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'

export type TipoCuenta = 'CBU' | 'CVU' | 'deposito'

export type CuentaSinIva = {
  id: number
  nombre: string
  tipo: TipoCuenta
  cbu: string
  alias: string
  cuit?: string | null
  banco?: string | null
}

type CuentaInput = { nombre: string; tipo: TipoCuenta; cbu: string; alias: string; cuit?: string; banco?: string }

export async function crearCuentaSinIva(data: CuentaInput) {
  const supabase = createServiceClient()
  const { data: created, error } = await supabase
    .from('cuentas_sin_iva')
    .insert(data)
    .select('id, nombre, tipo, cbu, alias, cuit, banco')
    .single()
  if (error || !created) return { ok: false as const, error: error?.message ?? 'Error al crear', cuenta: undefined }
  revalidatePath('/dashboard/admin/configuracion')
  return { ok: true as const, cuenta: created as CuentaSinIva }
}

export async function actualizarCuentaSinIva(id: number, data: CuentaInput) {
  const supabase = createServiceClient()
  const { error } = await supabase.from('cuentas_sin_iva').update(data).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/dashboard/admin/configuracion')
  return { ok: true }
}

export async function eliminarCuentaSinIva(id: number) {
  const supabase = createServiceClient()
  // Desasignar de canales primero para no violar FK (ON DELETE SET NULL lo hace en DB,
  // pero el cliente service no pasa por triggers, mejor ser explícito)
  await supabase.from('canales').update({ cuenta_sin_iva_id: null }).eq('cuenta_sin_iva_id', id)
  const { error } = await supabase.from('cuentas_sin_iva').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/dashboard/admin/configuracion')
  return { ok: true }
}
