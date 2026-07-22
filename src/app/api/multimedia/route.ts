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

// Subir una foto de producto (webp ya optimizada en el cliente)
export async function POST(request: Request) {
  if (!(await verificarMaster())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const form = await request.formData()
  const file = form.get('file') as File | null
  const productoId = Number(form.get('producto_id'))
  const codigo = (form.get('codigo_interno') as string | null)?.trim()
  const orden = Number(form.get('orden'))

  if (!file || !productoId || !codigo) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const path = `productos/${codigo}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.webp`

  const { error: uploadError } = await admin.storage
    .from('multimedia')
    .upload(path, file, { contentType: 'image/webp', upsert: false })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: foto, error: dbError } = await admin
    .from('producto_fotos')
    .insert({ producto_id: productoId, url: path, orden: Number.isFinite(orden) ? orden : 0 })
    .select()
    .single()
  if (dbError) {
    await admin.storage.from('multimedia').remove([path])
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ foto })
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
