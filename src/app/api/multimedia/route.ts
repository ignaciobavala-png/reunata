import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verificarMaster(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  return profile?.rol === 'master'
}

export async function DELETE(request: Request) {
  if (!(await verificarMaster())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { path, fotoId } = await request.json()

  await admin.storage.from('multimedia').remove([path])
  if (fotoId) await admin.from('producto_fotos').delete().eq('id', fotoId)

  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request) {
  if (!(await verificarMaster())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { id } = body

  const update: Record<string, unknown> = {}
  if ('orden' in body) update.orden = body.orden
  if ('destacada' in body) update.destacada = body.destacada

  await admin.from('producto_fotos').update(update).eq('id', id)

  return NextResponse.json({ ok: true })
}
