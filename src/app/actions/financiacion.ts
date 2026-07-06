'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const MAYORISTAS = ['distribuidor', 'local', 'mercha', 'fabricantes']

async function getMayoristaId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  if (!p || !MAYORISTAS.includes(p.rol)) return null
  return user.id
}

export async function crearSolicitudCredito(formData: FormData) {
  const clienteId = await getMayoristaId()
  if (!clienteId) return { error: 'No autorizado' }

  const supabase = await createClient()

  const monto      = parseFloat(formData.get('monto') as string ?? '')
  const garantias  = (formData.get('garantias') as string ?? '').trim() || null
  const notas      = (formData.get('notas')     as string ?? '').trim() || null

  if (isNaN(monto) || monto <= 0) return { error: 'Ingresá un monto válido.' }

  // Parsear referencias comerciales
  const refs: { cuit: string; telefono: string | null; email: string | null; direccion: string | null }[] = []
  for (let i = 0; i < 3; i++) {
    const cuit     = ((formData.get(`ref_${i}_cuit`)     as string) ?? '').trim()
    const telefono = ((formData.get(`ref_${i}_telefono`) as string) ?? '').trim() || null
    const email    = ((formData.get(`ref_${i}_email`)    as string) ?? '').trim() || null
    const direccion = ((formData.get(`ref_${i}_direccion`) as string) ?? '').trim() || null
    if (cuit) refs.push({ cuit, telefono, email, direccion })
  }
  if (refs.length < 2) return { error: 'Ingresá al menos 2 referencias comerciales (CUIT requerido en cada una).' }

  // Verificar que no haya una solicitud pendiente activa
  const { data: existente } = await supabase
    .from('solicitudes_credito')
    .select('id')
    .eq('cliente_id', clienteId)
    .eq('estado', 'pendiente')
    .maybeSingle()

  if (existente) {
    return { error: 'Ya tenés una solicitud pendiente de evaluación. Esperá la respuesta antes de enviar otra.' }
  }

  const { error } = await supabase.from('solicitudes_credito').insert({
    cliente_id: clienteId,
    monto,
    garantias,
    notas,
    referencias_comerciales: refs,
  })

  if (error) return { error: 'Error al enviar la solicitud.' }
  revalidatePath('/cuenta/financiacion')
  return { ok: true }
}

export async function cancelarSolicitudCredito(id: string) {
  const clienteId = await getMayoristaId()
  if (!clienteId) return { error: 'No autorizado' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('solicitudes_credito')
    .update({ estado: 'cancelado', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('cliente_id', clienteId)
    .eq('estado', 'pendiente')

  if (error) return { error: 'Error al cancelar la solicitud.' }
  revalidatePath('/cuenta/financiacion')
  return { ok: true }
}

// ── Admin actions ──────────────────────────────────────────────────────────

async function getMasterEmpleadoId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  if (!p || !['master', 'empleado'].includes(p.rol)) return null
  return user.id
}

export async function responderSolicitudCredito(
  id: string,
  estado: 'aprobado' | 'rechazado',
  respuesta: string,
) {
  const adminId = await getMasterEmpleadoId()
  if (!adminId) return { error: 'No autorizado' }

  const service = createServiceClient()
  const { error } = await service
    .from('solicitudes_credito')
    .update({ estado, respuesta: respuesta.trim() || null, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: 'Error al actualizar la solicitud.' }
  revalidatePath('/dashboard/admin/financiacion')
  return { ok: true }
}
