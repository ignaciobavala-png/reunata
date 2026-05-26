'use server'

import { createServiceClient } from '@/lib/supabase/server'

export async function suscribirNewsletter(email: string): Promise<{ ok: boolean; duplicado?: boolean }> {
  if (!email || !email.includes('@')) return { ok: false }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('newsletter_suscriptores')
    .insert({ email: email.toLowerCase().trim() })

  if (error) {
    if (error.code === '23505') return { ok: true, duplicado: true }
    return { ok: false }
  }

  return { ok: true }
}
