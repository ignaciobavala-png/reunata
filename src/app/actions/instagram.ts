'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'

export interface PostInstagram {
  id: number
  thumbnail_url: string
  caption: string | null
  orden: number
  url_instagram: string | null
  permalink: string | null
  username: string | null
  activo: boolean
  created_at: string
}

export async function agregarPost(thumbnail_url: string, caption?: string) {
  const supabase = createServiceClient()

  const { data: maxOrden } = await supabase
    .from('comunidad_fotos')
    .select('orden')
    .order('orden', { ascending: false })
    .limit(1)
    .maybeSingle()

  const orden = (maxOrden?.orden ?? -1) + 1

  const { error } = await supabase.from('comunidad_fotos').insert({
    thumbnail_url,
    caption: caption ?? null,
    orden,
  })

  if (error) return { ok: false, error: error.message }
  revalidatePath('/dashboard/admin/instagram')
  return { ok: true }
}

export async function eliminarPost(id: number, storagePath?: string) {
  const supabase = createServiceClient()

  if (storagePath) {
    await supabase.storage.from('multimedia').remove([storagePath])
  }

  const { error } = await supabase.from('comunidad_fotos').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/dashboard/admin/instagram')
  return { ok: true }
}

export async function actualizarCaption(id: number, caption: string) {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('comunidad_fotos')
    .update({ caption: caption || null })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/dashboard/admin/instagram')
  return { ok: true }
}

export async function reordenarPosts(ids: number[]) {
  const supabase = createServiceClient()
  await Promise.all(
    ids.map((id, idx) =>
      supabase.from('comunidad_fotos').update({ orden: idx }).eq('id', id)
    )
  )
  revalidatePath('/dashboard/admin/instagram')
}

export async function getPostsPublic(): Promise<PostInstagram[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('comunidad_fotos')
    .select('*')
    .eq('activo', true)
    .order('orden')
  return data ?? []
}
