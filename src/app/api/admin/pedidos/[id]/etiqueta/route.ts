import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getEtiquetaPdf } from '@/lib/enviopack'

const ROLES_ADMIN = ['master', 'empleado']

// Devuelve la etiqueta PDF del envío de un pedido, para imprimir y pegar en el
// paquete. Solo admin. Enviopack la tiene disponible recién cuando el envío
// está procesado (tracking asignado).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin permisos.' }, { status: 401 })
  const { data: perfil } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  if (!ROLES_ADMIN.includes(perfil?.rol ?? '')) {
    return NextResponse.json({ error: 'Sin permisos.' }, { status: 403 })
  }

  const service = createServiceClient()
  const { data: pedido } = await service
    .from('pedidos')
    .select('numero, enviopack_envio_id')
    .eq('id', id)
    .single()
  if (!pedido?.enviopack_envio_id) {
    return NextResponse.json({ error: 'El pedido no tiene envío generado.' }, { status: 404 })
  }

  const res = await getEtiquetaPdf(pedido.enviopack_envio_id)
  if (!res.ok || !res.pdf) {
    return NextResponse.json({ error: res.error ?? 'Etiqueta no disponible.' }, { status: 502 })
  }

  return new NextResponse(res.pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="etiqueta-pedido-${pedido.numero}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
