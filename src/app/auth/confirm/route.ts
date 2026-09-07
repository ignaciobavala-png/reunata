import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * Confirmación de links de mail (recuperar contraseña, confirmar cuenta).
 *
 * Acepta los dos formatos porque conviven:
 *  - token_hash: no depende de estado local, funciona abriendo el mail en
 *    cualquier dispositivo. Es el que hay que usar.
 *  - code (PKCE): el code_verifier vive en una cookie del navegador que pidió
 *    el mail, así que solo anda ahí. Queda como fallback para los links viejos.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next')

  // Viene de un link de mail: sin este guard es un open redirect.
  // "//evil.com" es protocol-relative, por eso no alcanza con startsWith('/').
  const next =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : null

  const destino = next ?? (type === 'recovery' ? '/nueva-contrasena' : '/')
  const fallo = `${origin}/recuperar-contrasena?error=link_invalido`

  if (!tokenHash && !code) {
    return NextResponse.redirect(fallo)
  }

  // El token no sigue viaje al historial ni al Referer.
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

  const { error } =
    tokenHash && type
      ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      : await supabase.auth.exchangeCodeForSession(code!)

  // El caso común no es un link falso sino uno vencido o ya usado.
  if (error) {
    return NextResponse.redirect(fallo)
  }

  return response
}
