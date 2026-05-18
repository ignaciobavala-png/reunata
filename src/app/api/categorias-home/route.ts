import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function verificarMaster(request: Request): boolean {
  return request.headers.get('X-Is-Master') === 'true'
}

export async function PATCH(request: Request) {
  if (!verificarMaster(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id, ...fields } = await request.json()
  await admin.from('categorias_home').update(fields).eq('id', id)

  return NextResponse.json({ ok: true })
}

export async function POST(request: Request) {
  if (!verificarMaster(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { data } = await admin
    .from('categorias_home')
    .insert({ nombre: body.nombre, descripcion: body.descripcion, href: body.href, gesu_categoria: body.gesu_categoria || null })
    .select()
    .single()

  return NextResponse.json({ data })
}
