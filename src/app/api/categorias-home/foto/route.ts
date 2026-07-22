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

// Subir foto de portada de una categoría
export async function POST(request: Request) {
  if (!(await verificarMaster())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const form = await request.formData()
  const file = form.get('file') as File | null
  const id = Number(form.get('id'))
  const oldPath = (form.get('oldPath') as string | null) || null

  if (!file || !id) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'El archivo debe ser una imagen.' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `categorias/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error: uploadError } = await admin.storage
    .from('multimedia')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  if (oldPath) await admin.storage.from('multimedia').remove([oldPath])

  await admin.from('categorias_home').update({ foto_url: path }).eq('id', id)

  return NextResponse.json({ foto_url: path })
}

// Quitar foto de portada
export async function DELETE(request: Request) {
  if (!(await verificarMaster())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id, path } = await request.json()
  if (path) await admin.storage.from('multimedia').remove([path])
  if (id) await admin.from('categorias_home').update({ foto_url: null }).eq('id', id)

  return NextResponse.json({ ok: true })
}
