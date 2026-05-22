import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth_error`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=oauth_error`)
  }

  const userId = data.user.id
  const serviceSupabase = createServiceClient()

  // Verificar si el profile ya tiene rol asignado (usuario que ya existía)
  const { data: profile } = await serviceSupabase
    .from('profiles')
    .select('rol, aprobado')
    .eq('id', userId)
    .single()

  // Solo actualizar si es un usuario nuevo (sin rol) o si llegó por OAuth y es consumidor_final
  const isNewOrMinorista = !profile?.rol || profile.rol === 'consumidor_final'

  if (isNewOrMinorista) {
    const nombre =
      data.user.user_metadata?.full_name ||
      data.user.user_metadata?.name ||
      data.user.email?.split('@')[0] ||
      null

    const { data: canal } = await serviceSupabase
      .from('canales')
      .select('id')
      .eq('slug', 'consumidor_final')
      .single()

    await serviceSupabase
      .from('profiles')
      .update({
        rol: 'consumidor_final',
        aprobado: true,
        nombre,
        ...(canal ? { canal_id: canal.id } : {}),
      })
      .eq('id', userId)
  }

  const destino = next.startsWith('/') && !next.startsWith('//') ? next : '/'
  return NextResponse.redirect(`${origin}${destino}`)
}
