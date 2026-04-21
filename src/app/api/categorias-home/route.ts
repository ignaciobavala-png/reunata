import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verificarMaster() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await admin.from('profiles').select('rol').eq('id', user.id).single()
  return data?.rol === 'master'
}

export async function PATCH(request: Request) {
  if (!await verificarMaster()) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id, ...fields } = await request.json()
  await admin.from('categorias_home').update(fields).eq('id', id)

  return NextResponse.json({ ok: true })
}

export async function POST(request: Request) {
  if (!await verificarMaster()) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { data } = await admin
    .from('categorias_home')
    .insert({ nombre: body.nombre, descripcion: body.descripcion, href: body.href, categoria_keys: body.categoria_keys })
    .select()
    .single()

  return NextResponse.json({ data })
}
