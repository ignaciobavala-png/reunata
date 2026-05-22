import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth_error`)
  }

  const destino = next.startsWith('/') && !next.startsWith('//') ? next : '/'
  const response = NextResponse.redirect(`${origin}${destino}`)

  // En route handlers las cookies son read-only vía cookies().
  // Las cookies de sesión deben escribirse directamente en el response.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=oauth_error`)
  }

  const userId = data.user.id
  const serviceSupabase = createServiceClient()

  const { data: profile } = await serviceSupabase
    .from('profiles')
    .select('rol, aprobado')
    .eq('id', userId)
    .single()

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

  return response
}
