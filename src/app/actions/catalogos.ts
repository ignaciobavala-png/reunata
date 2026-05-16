'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const BUCKET = 'catalogos'
const MAX_BYTES = 20 * 1024 * 1024

export async function subirCatalogo(formData: FormData) {
  const file  = formData.get('file')  as File | null
  const titulo = (formData.get('titulo') as string | null)?.trim()

  if (!file || !titulo)                    return { ok: false, error: 'Completá el nombre y seleccioná un archivo.' }
  if (file.type !== 'application/pdf')     return { ok: false, error: 'Solo se aceptan archivos PDF.' }
  if (file.size > MAX_BYTES)               return { ok: false, error: 'El archivo supera el límite de 20 MB.' }

  const supabase = createServiceClient()
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filename, file, { contentType: 'application/pdf' })

  if (uploadError) return { ok: false, error: uploadError.message }

  const { error: dbError } = await supabase
    .from('catalogos')
    .insert({ titulo, url: filename })

  if (dbError) {
    await supabase.storage.from(BUCKET).remove([filename])
    return { ok: false, error: dbError.message }
  }

  revalidatePath('/dashboard/admin/catalogos')
  return { ok: true }
}

export async function eliminarCatalogo(id: number, url: string) {
  const supabase = createServiceClient()

  const { error } = await supabase.from('catalogos').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }

  await supabase.storage.from(BUCKET).remove([url])

  revalidatePath('/dashboard/admin/catalogos')
  return { ok: true }
}

export async function toggleCatalogoActivo(id: number, activo: boolean) {
  const supabase = createServiceClient()
  const { error } = await supabase.from('catalogos').update({ activo }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/dashboard/admin/catalogos')
  return { ok: true }
}
