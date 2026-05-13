'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

const MAX_LENGTHS: Record<string, number> = {
  nombre: 100,
  apellido: 100,
  email: 255,
  dni: 20,
  direccion: 255,
  nacionalidad: 100,
  zonas: 500,
  otras_marcas: 500,
  cargo: 100,
  empresa: 100,
  cuit: 20,
  pagina_web: 500,
  productos_servicios: 1000,
  otras_empresas_provee: 1000,
}

const ALLOWED_CV_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]

const MAX_CV_SIZE = 5 * 1024 * 1024       // 5 MB
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hora
const RATE_LIMIT_MAX = 5                     // max postulaciones por hora globales

export async function crearPostulacion(formData: FormData) {
  const tipo = formData.get('tipo') as string
  if (tipo !== 'fulltime' && tipo !== 'comisionista' && tipo !== 'proveedor') {
    return { error: 'Tipo de postulación inválido.' }
  }

  const campos: Record<string, string | boolean | null> = {
    tipo,
    nombre: formData.get('nombre') as string,
    apellido: formData.get('apellido') as string,
    email: formData.get('email') as string,
    dni: formData.get('dni') as string || null,
    direccion: formData.get('direccion') as string,
    nacionalidad: formData.get('nacionalidad') as string || null,
  }

  const requiredBase = ['nombre', 'apellido', 'email', 'direccion']
  const required = requiredBase
  for (const key of required) {
    if (!campos[key]) return { error: `El campo ${key} es obligatorio.` }
  }

  for (const [key, max] of Object.entries(MAX_LENGTHS)) {
    const val = campos[key] as string
    if (val && val.length > max) {
      return { error: `El campo ${key} excede los ${max} caracteres.` }
    }
  }

  const supabase = createServiceClient()

  const { count } = await supabase
    .from('postulaciones')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString())

  if (count && count >= RATE_LIMIT_MAX) {
    return { error: 'Demasiadas postulaciones. Intentalo mas tarde.' }
  }

  let cvUrl: string | null = null

  if (tipo === 'fulltime') {
    const cvFile = formData.get('cv') as File | null
    if (cvFile && cvFile.size > 0) {
      if (!ALLOWED_CV_MIMES.includes(cvFile.type)) {
        return { error: 'Formato de CV no permitido. Usa PDF, DOC, DOCX, JPG o PNG.' }
      }
      if (cvFile.size > MAX_CV_SIZE) {
        return { error: 'El CV no puede superar los 5 MB.' }
      }

      const ext = cvFile.name.split('.').pop()?.toLowerCase() ?? 'pdf'
      if (!['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'].includes(ext)) {
        return { error: 'Extension de archivo no permitida.' }
      }

      const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('cv')
        .upload(filename, cvFile)
      if (uploadError) return { error: `Error al subir CV: ${uploadError.message}` }

      const { data: urlData } = supabase.storage.from('cv').getPublicUrl(filename)
      cvUrl = urlData.publicUrl
    }
  }

  if (tipo === 'comisionista') {
    campos.movilidad_propia = formData.get('movilidad_propia') === 'true'
    campos.zonas = (formData.get('zonas') as string) || null
    campos.otras_marcas = (formData.get('otras_marcas') as string) || null
  }

  if (tipo === 'proveedor') {
    campos.cargo = (formData.get('cargo') as string) || null
    campos.empresa = (formData.get('empresa') as string) || null
    campos.cuit = (formData.get('cuit') as string) || null
    campos.pagina_web = (formData.get('pagina_web') as string) || null
    campos.productos_servicios = (formData.get('productos_servicios') as string) || null
    campos.otras_empresas_provee = (formData.get('otras_empresas_provee') as string) || null
  }

  const { error } = await supabase.from('postulaciones').insert({
    ...campos,
    cv_url: cvUrl,
  })

  if (error) return { error: `Error al guardar: ${error.message}` }

  return { ok: true }
}

export async function actualizarEstadoPostulacion(id: string, estado: 'aprobado' | 'rechazado') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  const rolesInternos = ['master', 'empleado', 'comisionista']
  if (!profile || !rolesInternos.includes(profile.rol)) {
    return { error: 'No autorizado' }
  }

  const { error } = await supabase
    .from('postulaciones')
    .update({ estado })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/admin/postulaciones')
  return { ok: true }
}

export async function eliminarPostulacion(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  const rolesInternos = ['master', 'empleado', 'comisionista']
  if (!profile || !rolesInternos.includes(profile.rol)) {
    return { error: 'No autorizado' }
  }

  const { error } = await supabase
    .from('postulaciones')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/admin/postulaciones')
  return { ok: true }
}
