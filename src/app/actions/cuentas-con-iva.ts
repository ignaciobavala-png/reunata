'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'

// Cuentas +IVA (Factura A) — espejo de cuentas-sin-iva.ts. Se vinculan a la forma
// de pago "Transferencia (Factura A)" (transferencia_blanco) por canal.

export type TipoCuenta = 'CBU' | 'CVU' | 'deposito'

export type CuentaConIva = {
  id: number
  nombre: string
  tipo: TipoCuenta
  cbu: string
  alias: string
  cuit?: string | null
  banco?: string | null
}

type CuentaInput = { nombre: string; tipo: TipoCuenta; cbu: string; alias: string; cuit?: string; banco?: string }

export async function crearCuentaConIva(data: CuentaInput) {
  const supabase = createServiceClient()
  const { data: created, error } = await supabase
    .from('cuentas_con_iva')
    .insert(data)
    .select('id, nombre, tipo, cbu, alias, cuit, banco')
    .single()
  if (error || !created) return { ok: false as const, error: error?.message ?? 'Error al crear', cuenta: undefined }
  revalidatePath('/dashboard/admin/configuracion')
  return { ok: true as const, cuenta: created as CuentaConIva }
}

export async function actualizarCuentaConIva(id: number, data: CuentaInput) {
  const supabase = createServiceClient()
  const { error } = await supabase.from('cuentas_con_iva').update(data).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/dashboard/admin/configuracion')
  return { ok: true }
}

export async function eliminarCuentaConIva(id: number) {
  const supabase = createServiceClient()
  // Desasignar de canales primero (ON DELETE SET NULL lo hace en DB, pero el
  // cliente service no pasa por triggers, mejor ser explícito)
  await supabase.from('canales').update({ cuenta_con_iva_id: null }).eq('cuenta_con_iva_id', id)
  const { error } = await supabase.from('cuentas_con_iva').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/dashboard/admin/configuracion')
  return { ok: true }
}
