import { createClient, createServiceClient } from '@/lib/supabase/server'

export interface CanalUsuario {
  canalId: number
  slug: string
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
const ROLES_MAYORISTA = ['distribuidor', 'local', 'mercha']

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
          .select('id, slug, lista_precios')
          .eq('id', profile.canal_id)
          .single()

        if (canalData) {
          canal = {
            canalId: canalData.id,
            slug: canalData.slug,
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

      // consumidor_final sin canal asignado → usar canal CF en memoria (sin escribir a DB)
      if (!canalId && profile.rol === 'consumidor_final') {
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
