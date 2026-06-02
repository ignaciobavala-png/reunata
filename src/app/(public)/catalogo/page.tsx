export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resolverCanalTienda, getProductosDelCanal } from '@/lib/tienda'
import { CatalogoView } from './CatalogoView'

export const metadata: Metadata = { title: 'Catálogo — Reunata' }

const ROLES_ADMIN = ['master', 'empleado']

async function resolverCanal(preview: string | undefined) {
  const service = createServiceClient()
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  // Detectar si es admin
  let isAdmin = false
  if (user) {
    const { data: profile } = await service.from('profiles').select('rol').eq('id', user.id).single()
    isAdmin = ROLES_ADMIN.includes(profile?.rol ?? '')
  }

  // Admin sin ?preview → redirigir a consumidor_final por defecto
  if (isAdmin && !preview) {
    return { redirectTo: '/catalogo?preview=consumidor_final' as string }
  }

  // Admin con ?preview → mostrar ese canal
  if (isAdmin && preview) {
    const { data: canal } = await service
      .from('canales')
      .select('id, nombre, slug, lista_precios')
      .eq('slug', preview)
      .single()
    if (canal) {
      return {
        canalId: canal.id as number,
        listaPrecio: canal.lista_precios as string,
        mostrarPrecios: true,
        nombreCanal: canal.nombre as string,
        pendienteAprobacion: false,
        isAdminPreview: true,
      }
    }
  }

  // Usuario normal → su canal real
  const canalInfo = await resolverCanalTienda()
  const { data: canal } = await service
    .from('canales')
    .select('nombre')
    .eq('id', canalInfo.canalId)
    .single()

  return {
    canalId: canalInfo.canalId,
    listaPrecio: canalInfo.listaPrecio,
    mostrarPrecios: canalInfo.mostrarPrecios,
    nombreCanal: canal?.nombre ?? 'Catálogo',
    pendienteAprobacion: canalInfo.pendienteAprobacion,
    isAdminPreview: false,
  }
}

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>
}) {
  const { preview } = await searchParams
  const service = createServiceClient()

  const [canalData, { data: configRows }] = await Promise.all([
    resolverCanal(preview),
    service
      .from('configuracion')
      .select('clave, valor')
      .in('clave', ['catalogo_mostrar_codigo', 'catalogo_columnas']),
  ])

  if ('redirectTo' in canalData) redirect(canalData.redirectTo!)
  if (canalData.pendienteAprobacion) redirect('/')

  const configMap = Object.fromEntries((configRows ?? []).map(r => [r.clave, r.valor]))
  const mostrarCodigo = configMap['catalogo_mostrar_codigo'] !== 'false'
  const columnas = parseInt(configMap['catalogo_columnas'] ?? '3', 10)

  const { ids } = await getProductosDelCanal(canalData.canalId)

  const { data: productosRaw } = await service
    .from('productos')
    .select('id, titulo, codigo_interno, precio_lista1, precio_lista2, precio_lista3, precio_lista5, producto_fotos(url, orden)')
    .eq('activo', true)
    .in('id', ids.length > 0 ? ids : [-1])
    .order('titulo')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const productos = (productosRaw ?? []).map(p => {
    const fotos = ((p.producto_fotos ?? []) as { url: string; orden: number }[])
      .sort((a, b) => a.orden - b.orden)
    const precio = canalData.mostrarPrecios && canalData.listaPrecio
      ? ((p as Record<string, unknown>)[canalData.listaPrecio] as number | null) ?? null
      : null
    return {
      id: p.id,
      titulo: p.titulo,
      codigo_interno: p.codigo_interno,
      foto_url: fotos[0]?.url ?? null,
      precio,
      supabaseUrl,
    }
  })

  return (
    <CatalogoView
      productos={productos}
      nombreCanal={canalData.nombreCanal}
      mostrarPrecios={canalData.mostrarPrecios}
      mostrarCodigo={mostrarCodigo}
      columnas={columnas}
      isAdminPreview={canalData.isAdminPreview}
    />
  )
}
