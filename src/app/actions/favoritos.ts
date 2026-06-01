'use server'

import { createClient } from '@/lib/supabase/server'

export async function toggleFavorito(productoId: number): Promise<{
  ok: boolean
  ahora: 'agregado' | 'eliminado' | null
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, ahora: null, error: 'Sin sesión' }

  const { data: existing } = await supabase
    .from('favoritos')
    .select('id')
    .eq('user_id', user.id)
    .eq('producto_id', productoId)
    .maybeSingle()

  if (existing) {
    await supabase.from('favoritos').delete().eq('id', existing.id)
    return { ok: true, ahora: 'eliminado' }
  }

  await supabase.from('favoritos').insert({ user_id: user.id, producto_id: productoId })
  return { ok: true, ahora: 'agregado' }
}
