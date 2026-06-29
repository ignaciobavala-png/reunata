import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { resolverCanalTienda } from '@/lib/tienda'
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

  const [{ mostrarPrecios }, { data: configRows }] = await Promise.all([
    resolverCanalTienda(),
    supabase.from('configuracion').select('clave, valor').in('clave', ['cbu_sin_iva', 'alias_sin_iva']),
  ])

  const cfg = Object.fromEntries((configRows ?? []).map(r => [r.clave, r.valor ?? '']))

  return (
    <CartClient
      user={pageUser}
      mostrarPrecios={mostrarPrecios}
      cbuSinIva={cfg['cbu_sin_iva'] || undefined}
      aliasSinIva={cfg['alias_sin_iva'] || undefined}
    />
  )
}
