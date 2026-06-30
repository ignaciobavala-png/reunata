import type { Metadata } from 'next'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resolverCanalTienda } from '@/lib/tienda'
import { CartClient } from './CartClient'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function CarritoPage() {
  const supabase = await createClient()
  const service = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()

  let pageUser: { nombre: string | null; rol: string; categoriaComercial: string | null } | null = null
  let canalId: number | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('nombre, rol, canal_id')
      .eq('id', user.id)
      .single()
    if (profile) {
      canalId = profile.canal_id ?? null
      let categoriaComercial: string | null = null
      if (canalId) {
        const { data: canalRow } = await service
          .from('canales')
          .select('categoria_comercial')
          .eq('id', canalId)
          .maybeSingle()
        categoriaComercial = canalRow?.categoria_comercial ?? null
      }
      pageUser = { nombre: profile.nombre, rol: profile.rol, categoriaComercial }
    }
  }

  let cbuSinIva: string | undefined
  let aliasSinIva: string | undefined
  let tipoCuentaSinIva: 'CBU' | 'CVU' | 'deposito' = 'CBU'
  let cuitSinIva: string | undefined
  let bancoSinIva: string | undefined

  if (canalId) {
    const { data: canalRow } = await service
      .from('canales')
      .select('cuentas_sin_iva(tipo, cbu, alias, cuit, banco, nombre)')
      .eq('id', canalId)
      .maybeSingle()
    const cuenta = (canalRow as {
      cuentas_sin_iva: { tipo: string; cbu: string; alias: string; cuit?: string; banco?: string; nombre: string } | null
    } | null)?.cuentas_sin_iva
    if (cuenta?.cbu) {
      tipoCuentaSinIva = (cuenta.tipo as 'CBU' | 'CVU' | 'deposito') || 'CBU'
      cbuSinIva = cuenta.cbu
      aliasSinIva = cuenta.alias || undefined
      cuitSinIva = cuenta.cuit || undefined
      bancoSinIva = cuenta.banco || undefined
    }
  }

  const { mostrarPrecios } = await resolverCanalTienda()

  return (
    <CartClient
      user={pageUser}
      mostrarPrecios={mostrarPrecios}
      cbuSinIva={cbuSinIva}
      aliasSinIva={aliasSinIva}
      tipoCuentaSinIva={tipoCuentaSinIva}
      cuitSinIva={cuitSinIva}
      bancoSinIva={bancoSinIva}
    />
  )
}
