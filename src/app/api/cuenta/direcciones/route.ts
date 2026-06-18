import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ direcciones: [] })

  const { data } = await supabase
    .from('direcciones_entrega')
    .select('id, alias, calle, numero, piso, localidad, provincia, codigo_postal, predeterminada')
    .eq('cliente_id', user.id)
    .eq('activa', true)
    .order('predeterminada', { ascending: false })
    .order('created_at', { ascending: true })

  return NextResponse.json({ direcciones: data ?? [] })
}
