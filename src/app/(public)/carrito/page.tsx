import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { CartClient } from './CartClient'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function CarritoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let pageUser: { nombre: string | null; rol: string } | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('nombre, rol')
      .eq('id', user.id)
      .single()
    if (profile) pageUser = { nombre: profile.nombre, rol: profile.rol }
  }

  return <CartClient user={pageUser} />
}
