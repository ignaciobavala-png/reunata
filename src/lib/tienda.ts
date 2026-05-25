import { createClient, createServiceClient } from '@/lib/supabase/server'

export interface CanalUsuario {
  canalId: number
  slug: string
  listaPrecio: string // 'precio_lista1' | 'precio_lista2' | 'precio_lista3' | 'precio_lista5'
  aprobado: boolean
}

export interface UserSession {
  nombre: string | null
  rol: string
  canal: CanalUsuario | null
}

/**
 * Resuelve la sesión del usuario y su canal de venta.
 * Si no hay sesión o no tiene canal asignado, devuelve el canal "publico" como fallback.
 */
const ROLES_MAYORISTA = ['distribuidor', 'local', 'mercha']

export async function resolverCanalTienda(): Promise<{
  user: UserSession | null
  canalId: number
  listaPrecio: string | null
  mostrarPrecios: boolean
  pendienteAprobacion: boolean
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

      userSession = { nombre: profile.nombre, rol: profile.rol, canal }

      // Mayorista que completó el formulario pero aún no fue aprobado
      if (ROLES_MAYORISTA.includes(profile.rol) && !profile.aprobado) {
        pendienteAprobacion = true
      }
    }
  }

  // Fallback a canal público si no hay canal resuelto
  if (!canalId) {
    const { data: publico } = await service
      .from('canales')
      .select('id')
      .eq('slug', 'publico')
      .single()
    canalId = publico?.id ?? null
  }

  return {
    user: userSession,
    canalId: canalId!,
    listaPrecio,
    mostrarPrecios,
    pendienteAprobacion,
  }
}

/**
 * Obtiene los IDs de productos visibles para un canal dado.
 */
export async function getProductosDelCanal(canalId: number): Promise<number[]> {
  const service = createServiceClient()
  const { data } = await service
    .from('producto_canales')
    .select('producto_id')
    .eq('canal_id', canalId)
  return (data ?? []).map(r => r.producto_id)
}
