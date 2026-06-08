export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resolverCanalTienda } from '@/lib/tienda'
import { CatalogoDescargas } from './CatalogoDescargas'

export const metadata: Metadata = { title: 'Catálogos — Reunata' }

const ROLES_CON_ACCESO = ['master', 'empleado', 'comisionista', 'distribuidor', 'local', 'mercha']

export default async function CatalogoPage() {
  const service = createServiceClient()
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  // Sin sesión → gate
  if (!user) {
    return <CatalogoDescargas pdfs={[]} estado="sin_sesion" />
  }

  const { data: perfil } = await service
    .from('profiles')
    .select('rol, aprobado')
    .eq('id', user.id)
    .single()

  const rol = perfil?.rol ?? ''
  const aprobado = perfil?.aprobado ?? false

  // Consumidor final o rol sin acceso → gate
  if (!ROLES_CON_ACCESO.includes(rol)) {
    return <CatalogoDescargas pdfs={[]} estado="sin_acceso" />
  }

  // Mayorista pendiente de aprobación
  const canalInfo = await resolverCanalTienda()
  if (canalInfo.pendienteAprobacion) {
    return <CatalogoDescargas pdfs={[]} estado="pendiente" />
  }

  // Fetch PDFs activos
  const { data: rows } = await service
    .from('catalogos')
    .select('id, titulo, url, created_at')
    .eq('activo', true)
    .order('created_at', { ascending: false })

  // Generar signed URLs (1 hora)
  const pdfs = await Promise.all(
    (rows ?? []).map(async (cat) => {
      const { data: signed } = await service.storage
        .from('catalogos')
        .createSignedUrl(cat.url, 3600)
      return {
        id: cat.id as number,
        titulo: cat.titulo as string,
        url: cat.url as string,
        created_at: cat.created_at as string,
        signedUrl: signed?.signedUrl ?? null,
      }
    })
  )

  return <CatalogoDescargas pdfs={pdfs.filter(p => p.signedUrl)} estado="ok" />
}
