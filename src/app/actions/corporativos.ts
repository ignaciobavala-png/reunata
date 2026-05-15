'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

const MAX_LENGTHS: Record<string, number> = {
  nombre: 100,
  empresa: 100,
  email: 255,
  telefono: 50,
  cuit: 20,
  ubicacion: 200,
  ocasion: 100,
}

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const RATE_LIMIT_MAX = 5

const OCASIONES_VALIDAS = [
  'Tu equipo de trabajo',
  'Un Evento',
  'Regalos para clientes',
  'Sos empresa de Mercha',
  'Otro',
]

const PRODUCTOS_VALIDOS = ['Mates', 'Mochilas', 'Termos', 'Todos']

export async function crearCorporativo(formData: FormData) {
  const nombre = formData.get('nombre') as string
  const empresa = formData.get('empresa') as string
  const email = formData.get('email') as string
  const telefono = formData.get('telefono') as string
  const cuit = formData.get('cuit') as string
  const ubicacion = formData.get('ubicacion') as string
  const ocasion = formData.get('ocasion') as string
  const cantidadesRaw = formData.get('cantidades') as string
  const productosRaw = formData.getAll('productos') as string[]
  const personalizar = formData.get('personalizar') as string
  const fechaLimite = formData.get('fecha_limite') as string

  if (!nombre?.trim()) return { error: 'El nombre es obligatorio.' }
  if (!empresa?.trim()) return { error: 'La empresa es obligatoria.' }
  if (!email?.trim()) return { error: 'El correo es obligatorio.' }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'El formato del correo no es válido.' }
  }

  for (const [key, max] of Object.entries(MAX_LENGTHS)) {
    const val = formData.get(key) as string
    if (val && val.length > max) {
      return { error: `El campo ${key} excede los ${max} caracteres.` }
    }
  }

  if (ocasion && !OCASIONES_VALIDAS.includes(ocasion)) {
    return { error: 'Opción de ocasión inválida.' }
  }

  const productosValidos = productosRaw.filter(p => PRODUCTOS_VALIDOS.includes(p))
  if (productosRaw.length > 0 && productosValidos.length === 0) {
    return { error: 'Productos seleccionados inválidos.' }
  }

  if (personalizar && !['Sí', 'No'].includes(personalizar)) {
    return { error: 'Valor de personalización inválido.' }
  }

  const supabase = createServiceClient()

  // Upload logo if provided
  let logoUrl: string | null = null
  const logoFile = formData.get('logo') as File | null
  if (logoFile && logoFile.size > 0) {
    const ext = logoFile.name.split('.').pop() ?? 'png'
    const path = `logos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const buffer = Buffer.from(await logoFile.arrayBuffer())
    const { error: uploadError } = await supabase.storage
      .from('corporativos')
      .upload(path, buffer, { contentType: logoFile.type, upsert: false })
    if (!uploadError) logoUrl = path
  }

  const { count } = await supabase
    .from('corporativos')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString())

  if (count && count >= RATE_LIMIT_MAX) {
    return { error: 'Demasiadas solicitudes. Intentalo mas tarde.' }
  }

  let cantidades: number | null = null
  if (cantidadesRaw) {
    cantidades = parseInt(cantidadesRaw, 10)
    if (isNaN(cantidades) || cantidades < 0) {
      return { error: 'Las cantidades deben ser un número válido.' }
    }
  }

  const fechaLimiteDate = fechaLimite || null

  const { error } = await supabase.from('corporativos').insert({
    nombre: nombre.trim(),
    empresa: empresa.trim(),
    email: email.trim(),
    telefono: telefono?.trim() || null,
    cuit: cuit?.trim() || null,
    ubicacion: ubicacion?.trim() || null,
    ocasion: ocasion || null,
    cantidades,
    productos: productosValidos,
    personalizar: personalizar || null,
    fecha_limite: fechaLimiteDate,
    logo_url: logoUrl,
  })

  if (error) return { error: `Error al guardar: ${error.message}` }

  return { ok: true }
}

export async function actualizarEstadoCorporativo(id: string, estado: 'aprobado' | 'rechazado') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!profile || !['master', 'empleado'].includes(profile.rol)) {
    return { error: 'No autorizado' }
  }

  const { error } = await supabase
    .from('corporativos')
    .update({ estado, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/admin/corporativos')
  return { ok: true }
}

export async function eliminarCorporativo(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!profile || !['master', 'empleado'].includes(profile.rol)) {
    return { error: 'No autorizado' }
  }

  const { error } = await supabase
    .from('corporativos')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/admin/corporativos')
  return { ok: true }
}
