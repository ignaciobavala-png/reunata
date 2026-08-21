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

  if (!file || !productoId || !codigo) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  // El orden lo decide el server: max(orden) + 1 del producto. Calcularlo en el
  // cliente a partir del largo de la lista chocaba con las posiciones ya usadas
  // cuando había fotos borradas (huecos), y dos fotos con el mismo orden se
  // desempatan distinto en cada consulta.
  const { data: ultima } = await admin
    .from('producto_fotos')
    .select('orden')
    .eq('producto_id', productoId)
    .order('orden', { ascending: false })
    .limit(1)
    .maybeSingle()
  const orden = (ultima?.orden ?? -1) + 1

  const path = `productos/${codigo}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.webp`

  const { error: uploadError } = await admin.storage
    .from('multimedia')
    .upload(path, file, { contentType: 'image/webp', upsert: false })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: foto, error: dbError } = await admin
    .from('producto_fotos')
    .insert({ producto_id: productoId, url: path, orden })
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

  // Reordenar: llega la lista completa de ids del producto en el orden deseado
  // y se reasignan las posiciones 0..n-1 en un solo statement.
  if (Array.isArray(body.ids)) {
    const productoId = Number(body.producto_id)
    const ids = body.ids.map(Number)
    if (!productoId || ids.some((n: number) => !Number.isFinite(n))) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    const { error } = await admin.rpc('reordenar_fotos', { p_producto_id: productoId, p_ids: ids })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const update: Record<string, unknown> = {}
  if ('orden' in body) update.orden = body.orden
  if ('destacada' in body) update.destacada = body.destacada

  // La estrella es la foto de portada del producto: una sola (índice único
  // parcial). Al marcar una hay que bajar la anterior, o el UPDATE choca.
  if (body.destacada === true) {
    const { data: foto } = await admin
      .from('producto_fotos')
      .select('producto_id')
      .eq('id', id)
      .maybeSingle()
    if (!foto) return NextResponse.json({ error: 'Foto inexistente' }, { status: 404 })
    const { error: errorLimpiar } = await admin
      .from('producto_fotos')
      .update({ destacada: false })
      .eq('producto_id', foto.producto_id)
      .eq('destacada', true)
      .neq('id', id)
    if (errorLimpiar) return NextResponse.json({ error: errorLimpiar.message }, { status: 500 })
  }

  const { error } = await admin.from('producto_fotos').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
