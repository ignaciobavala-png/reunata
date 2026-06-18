'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const MAYORISTAS = ['distribuidor', 'local', 'mercha']

async function getMayoristaId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  if (!p || !MAYORISTAS.includes(p.rol)) return null
  return user.id
}

export async function crearDireccion(formData: FormData) {
  const clienteId = await getMayoristaId()
  if (!clienteId) return { error: 'No autorizado' }

  const supabase = await createClient()

  const alias         = (formData.get('alias')         as string ?? '').trim()
  const calle         = (formData.get('calle')         as string ?? '').trim()
  const numero        = (formData.get('numero')        as string ?? '').trim()
  const piso          = (formData.get('piso')          as string ?? '').trim() || null
  const localidad     = (formData.get('localidad')     as string ?? '').trim()
  const provincia     = (formData.get('provincia')     as string ?? '').trim()
  const codigo_postal = (formData.get('codigo_postal') as string ?? '').trim()
  const predeterminada = formData.get('predeterminada') === 'true'

  if (!calle || !localidad || !provincia || !codigo_postal) {
    return { error: 'Completá los campos obligatorios.' }
  }

  // Si es predeterminada, quitar flag de las existentes primero
  if (predeterminada) {
    await supabase
      .from('direcciones_entrega')
      .update({ predeterminada: false })
      .eq('cliente_id', clienteId)
  }

  const { error } = await supabase.from('direcciones_entrega').insert({
    cliente_id: clienteId,
    alias, calle, numero, piso, localidad, provincia, codigo_postal, predeterminada,
  })

  if (error) return { error: 'Error al guardar la dirección.' }
  revalidatePath('/cuenta/direcciones')
  return { ok: true }
}

export async function actualizarDireccion(id: string, formData: FormData) {
  const clienteId = await getMayoristaId()
  if (!clienteId) return { error: 'No autorizado' }

  const supabase = await createClient()

  const alias         = (formData.get('alias')         as string ?? '').trim()
  const calle         = (formData.get('calle')         as string ?? '').trim()
  const numero        = (formData.get('numero')        as string ?? '').trim()
  const piso          = (formData.get('piso')          as string ?? '').trim() || null
  const localidad     = (formData.get('localidad')     as string ?? '').trim()
  const provincia     = (formData.get('provincia')     as string ?? '').trim()
  const codigo_postal = (formData.get('codigo_postal') as string ?? '').trim()
  const predeterminada = formData.get('predeterminada') === 'true'

  if (!calle || !localidad || !provincia || !codigo_postal) {
    return { error: 'Completá los campos obligatorios.' }
  }

  if (predeterminada) {
    await supabase
      .from('direcciones_entrega')
      .update({ predeterminada: false })
      .eq('cliente_id', clienteId)
  }

  const { error } = await supabase
    .from('direcciones_entrega')
    .update({ alias, calle, numero, piso, localidad, provincia, codigo_postal, predeterminada })
    .eq('id', id)
    .eq('cliente_id', clienteId)

  if (error) return { error: 'Error al actualizar la dirección.' }
  revalidatePath('/cuenta/direcciones')
  return { ok: true }
}

export async function eliminarDireccion(id: string) {
  const clienteId = await getMayoristaId()
  if (!clienteId) return { error: 'No autorizado' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('direcciones_entrega')
    .update({ activa: false })
    .eq('id', id)
    .eq('cliente_id', clienteId)

  if (error) return { error: 'Error al eliminar la dirección.' }
  revalidatePath('/cuenta/direcciones')
  return { ok: true }
}

export async function marcarPredeterminada(id: string) {
  const clienteId = await getMayoristaId()
  if (!clienteId) return { error: 'No autorizado' }

  const supabase = await createClient()
  await supabase
    .from('direcciones_entrega')
    .update({ predeterminada: false })
    .eq('cliente_id', clienteId)

  const { error } = await supabase
    .from('direcciones_entrega')
    .update({ predeterminada: true })
    .eq('id', id)
    .eq('cliente_id', clienteId)

  if (error) return { error: 'Error al actualizar.' }
  revalidatePath('/cuenta/direcciones')
  return { ok: true }
}
