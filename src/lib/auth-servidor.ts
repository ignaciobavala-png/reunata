import { createClient } from '@/lib/supabase/server'

/**
 * Permisos de las rutas API, resueltos siempre en el servidor.
 *
 * El bug que motivó este archivo: `/api/chatbot` y `/api/sync/*` confiaban en un
 * header `X-Is-Master: true` que mandaba el navegador, y los crons en
 * `x-vercel-cron`. Cualquiera podía mandar esos headers con curl. El rol sale de
 * la sesión (cookie de Supabase) y los crons se validan con `CRON_SECRET`, que
 * Vercel manda solo como `Authorization: Bearer …`.
 */

export async function esMasterDeSesion(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  return profile?.rol === 'master'
}

/** Cron de Vercel (CRON_SECRET) o llamada server-to-server (SYNC_SECRET). */
export function esLlamadaDeServidor(request: Request): boolean {
  const auth = request.headers.get('authorization')
  if (!auth) return false
  const { CRON_SECRET, SYNC_SECRET } = process.env
  if (CRON_SECRET && auth === `Bearer ${CRON_SECRET}`) return true
  if (SYNC_SECRET && auth === `Bearer ${SYNC_SECRET}`) return true
  return false
}
