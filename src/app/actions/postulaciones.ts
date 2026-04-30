'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function crearPostulacion(formData: FormData) {
  const tipo = formData.get('tipo') as string

  const campos: Record<string, string | boolean | null> = {
    tipo,
    nombre: formData.get('nombre') as string,
    apellido: formData.get('apellido') as string,
    email: formData.get('email') as string,
    dni: formData.get('dni') as string,
    direccion: formData.get('direccion') as string,
    nacionalidad: formData.get('nacionalidad') as string,
  }

  const required = ['nombre', 'apellido', 'email', 'dni', 'direccion', 'nacionalidad']
  for (const key of required) {
    if (!campos[key]) return { error: `El campo ${key} es obligatorio.` }
  }

  const supabase = createServiceClient()

  let cvUrl: string | null = null

  if (tipo === 'fulltime') {
    const cvFile = formData.get('cv') as File | null
    if (cvFile && cvFile.size > 0) {
      const ext = cvFile.name.split('.').pop() ?? 'pdf'
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
    campos.zonas = formData.get('zonas') as string
    campos.otras_marcas = formData.get('otras_marcas') as string || null
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

  const { error } = await supabase
    .from('postulaciones')
    .update({ estado })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/admin/postulaciones')
  return { ok: true }
}
