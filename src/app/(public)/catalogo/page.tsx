export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import { resolverCanalTienda, getProductosDelCanal } from '@/lib/tienda'
import { aplicarTipoCambio } from '@/lib/utils'
import { CatalogoDescargas } from './CatalogoDescargas'
import { CatalogoView } from './CatalogoView'

export const metadata: Metadata = { title: 'Catálogo — Reunata' }

const ROLES_CON_ACCESO = ['master', 'empleado', 'comisionista', 'distribuidor', 'local', 'mercha']
const ROLES_ADMIN = ['master', 'empleado']

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>
}) {
  const { preview } = await searchParams

  const service = createServiceClient()
  const { user, canalId: canalIdBase, listaPrecio: listaPrecioBase, pendienteAprobacion, tipoCambioUsd } = await resolverCanalTienda()

  const rol = user?.rol ?? ''
  const esAdmin = ROLES_ADMIN.includes(rol)

  // Gates
  if (!user) return <CatalogoDescargas pdfs={[]} estado="sin_sesion" />
  if (!ROLES_CON_ACCESO.includes(rol)) return <CatalogoDescargas pdfs={[]} estado="sin_acceso" />
  if (pendienteAprobacion) return <CatalogoDescargas pdfs={[]} estado="pendiente" />

  // Preview override para admins: simula la vista de otro canal
  let canalId = canalIdBase
  let listaPrecio = listaPrecioBase
  let nombreCanal = ''
  let esPreview = false

  if (preview && esAdmin) {
    const { data: canalPreview } = await service
      .from('canales')
      .select('id, nombre, lista_precios')
      .eq('slug', preview)
      .eq('activo', true)
      .single()
    if (canalPreview) {
      canalId = canalPreview.id
      listaPrecio = canalPreview.lista_precios
      nombreCanal = canalPreview.nombre
      esPreview = true
    }
  }

  if (!nombreCanal) {
    const { data: canalData } = await service
      .from('canales')
      .select('nombre')
      .eq('id', canalId)
      .single()
    nombreCanal = canalData?.nombre ?? ''
  }

  // Configuración del catálogo
  const { data: configRows } = await service
    .from('configuracion')
    .select('clave, valor')
    .in('clave', ['catalogo_mostrar_codigo', 'catalogo_columnas'])
  const configMap: Record<string, string> = Object.fromEntries((configRows ?? []).map(r => [r.clave, r.valor]))
  const columnas = (parseInt(configMap['catalogo_columnas'] ?? '3') || 3) as 2 | 3 | 4
  const mostrarCodigo = configMap['catalogo_mostrar_codigo'] !== 'false'

  // Productos del canal
  const { ids } = await getProductosDelCanal(canalId)

  const { data: productosRaw } = ids.length > 0
    ? await service
        .from('productos')
        .select('id, codigo_interno, titulo, categoria, precio_lista1, precio_lista2, precio_lista3, precio_lista5, moneda, producto_fotos(url, orden, destacada)')
        .in('id', ids)
        .eq('activo', true)
        .order('categoria')
        .order('titulo')
    : { data: [] }

  const productos = (productosRaw ?? []).map(p => {
    const fotos = ((p.producto_fotos ?? []) as { url: string; orden: number; destacada: boolean }[])
      .sort((a, b) => (b.destacada ? 1 : 0) - (a.destacada ? 1 : 0) || a.orden - b.orden)
    const precioRaw = listaPrecio
      ? ((p as Record<string, unknown>)[listaPrecio] as number | null) ?? null
      : null
    const { precio } = aplicarTipoCambio(precioRaw, p.moneda ?? null, tipoCambioUsd)
    return {
      id: p.id as number,
      codigo_interno: p.codigo_interno as string,
      titulo: p.titulo as string,
      categoria: (p.categoria as string) ?? 'Sin categoría',
      precio,
      foto_url: fotos[0]?.url ?? null,
    }
  })

  return (
    <CatalogoView
      productos={productos}
      config={{ columnas, mostrarCodigo, nombreCanal }}
      supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
      esPreview={esPreview}
      previewCanal={preview}
    />
  )
}
