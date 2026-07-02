import { createClient, createServiceClient } from '@/lib/supabase/server'

export interface CanalUsuario {
  canalId: number
  slug: string
  categoriaComercial: string // 'minorista' | 'mayorista' | 'especial'
  listaPrecio: string // 'precio_lista3' (mayorista) | 'precio_lista5' (minorista)
  aprobado: boolean
}

export interface UserSession {
  nombre: string | null
  rol: string
  canal: CanalUsuario | null
}

/**
 * Resuelve la sesión del usuario y su canal de venta.
 * Fallback para usuarios sin sesión: canal "consumidor_final" (mismos productos, sin precios).
 * El canal "publico" no tiene gestión UI y no se usa como filtro de productos en la tienda.
 */
const ROLES_MAYORISTA = ['distribuidor', 'local', 'mercha', 'fabricantes']

export async function resolverCanalTienda(): Promise<{
  user: UserSession | null
  canalId: number
  listaPrecio: string | null
  mostrarPrecios: boolean
  pendienteAprobacion: boolean
  tipoCambioUsd: number
}> {
  const supabase = await createClient()
  const service = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()

  let userSession: UserSession | null = null
  let canalId: number | null = null
  let listaPrecio: string | null = null
  let mostrarPrecios = false
  let pendienteAprobacion = false

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('nombre, rol, canal_id, aprobado')
      .eq('id', user.id)
      .single()

    if (profile) {
      let canal: CanalUsuario | null = null

      if (profile.canal_id) {
        const { data: canalData } = await service
          .from('canales')
          .select('id, slug, categoria_comercial, lista_precios')
          .eq('id', profile.canal_id)
          .single()

        if (canalData) {
          canal = {
            canalId: canalData.id,
            slug: canalData.slug,
            categoriaComercial: canalData.categoria_comercial,
            listaPrecio: canalData.lista_precios,
            aprobado: profile.aprobado ?? false,
          }
          if (profile.aprobado) {
            canalId = canalData.id
            listaPrecio = canalData.lista_precios
            mostrarPrecios = true
          }
        }
      }

      // consumidor_final sin canal asignado → escribir a DB para que RLS funcione en browser
      if (!canalId && profile.rol === 'consumidor_final') {
        const { data: canalCF } = await service
          .from('canales')
          .select('id, slug, categoria_comercial, lista_precios')
          .eq('slug', 'consumidor_final')
          .single()
        if (canalCF) {
          await service
            .from('profiles')
            .update({ canal_id: canalCF.id, aprobado: true })
            .eq('id', user.id)
          canalId = canalCF.id
          listaPrecio = canalCF.lista_precios
          mostrarPrecios = true
          canal = {
            canalId: canalCF.id,
            slug: canalCF.slug,
            categoriaComercial: canalCF.categoria_comercial,
            listaPrecio: canalCF.lista_precios,
            aprobado: true,
          }
        }
      }

      userSession = { nombre: profile.nombre, rol: profile.rol, canal }

      // Mayorista que completó el formulario pero aún no fue aprobado
      if (ROLES_MAYORISTA.includes(profile.rol) && !profile.aprobado) {
        pendienteAprobacion = true
      }
    }
  }

  // Fallback: sin sesión o sin canal resuelto → precios de consumidor_final visibles públicamente
  if (!canalId) {
    const { data: canalCF } = await service
      .from('canales')
      .select('id, lista_precios')
      .eq('slug', 'consumidor_final')
      .single()
    if (canalCF) {
      canalId = canalCF.id
      listaPrecio = canalCF.lista_precios
      mostrarPrecios = true
    }
  }

  const { data: tcRow } = await service
    .from('configuracion')
    .select('valor')
    .eq('clave', 'tipo_cambio_usd')
    .maybeSingle()
  const tipoCambioUsd = parseFloat(tcRow?.valor ?? '1') || 1

  return {
    user: userSession,
    canalId: canalId!,
    listaPrecio,
    mostrarPrecios,
    pendienteAprobacion,
    tipoCambioUsd,
  }
}

/**
 * Obtiene los IDs de productos visibles para un canal dado, junto con el múltiplo de cada uno.
 */
export async function getProductosDelCanal(canalId: number): Promise<{ ids: number[]; multiplos: Record<number, number> }> {
  const service = createServiceClient()
  const { data } = await service
    .from('producto_canales')
    .select('producto_id, multiplo')
    .eq('canal_id', canalId)
  const ids = (data ?? []).map(r => r.producto_id)
  const multiplos: Record<number, number> = {}
  for (const r of data ?? []) {
    multiplos[r.producto_id] = r.multiplo ?? 1
  }
  return { ids, multiplos }
}

// Cuenta bancaria "sin IVA" asignada al canal del usuario — para instrucciones
// de pago de pedidos con medio transferencia_cueva.
export async function getCuentaSinIvaDelUsuario(userId: string): Promise<{
  tipo: string; cbu: string; alias: string | null; cuit: string | null; banco: string | null
} | null> {
  const service = createServiceClient()
  const { data: perfil } = await service
    .from('profiles')
    .select('canal_id')
    .eq('id', userId)
    .single()
  if (!perfil?.canal_id) return null
  const { data: canalRow } = await service
    .from('canales')
    .select('cuentas_sin_iva(tipo, cbu, alias, cuit, banco)')
    .eq('id', perfil.canal_id)
    .maybeSingle()
  const cuenta = (canalRow as {
    cuentas_sin_iva: { tipo: string; cbu: string; alias: string | null; cuit: string | null; banco: string | null } | null
  } | null)?.cuentas_sin_iva
  return cuenta?.cbu ? cuenta : null
}
