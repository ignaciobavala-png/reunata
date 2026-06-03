import { createServiceClient } from '@/lib/supabase/server'
import { CatalogosClient } from './CatalogosClient'
import type { CatalogoItem } from './CatalogosClient'

export default async function CatalogosPage() {
  const supabase = createServiceClient()

  const [
    { data: canales },
    { data: configRows },
    { data: pdfsRaw },
  ] = await Promise.all([
    supabase.from('canales').select('id, nombre, slug').neq('slug', 'publico').order('id'),
    supabase.from('configuracion').select('clave, valor').in('clave', ['catalogo_mostrar_codigo', 'catalogo_columnas']),
    supabase.from('catalogos').select('id, titulo, url, activo, created_at').order('created_at', { ascending: false }),
  ])

  const configMap: Record<string, string> = Object.fromEntries(
    (configRows ?? []).map(r => [r.clave, r.valor])
  )

  const pdfs: CatalogoItem[] = await Promise.all(
    (pdfsRaw ?? []).map(async (c) => {
      const { data: signed } = await supabase.storage
        .from('catalogos')
        .createSignedUrl(c.url, 60 * 60)
      return { ...c, signedUrl: signed?.signedUrl ?? '' }
    })
  )

  return (
    <div className="p-8 max-w-4xl">
      <h1
        className="text-2xl mb-1"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}
      >
        Catálogo
      </h1>
      <p className="text-base mb-8" style={{ color: 'var(--color-acero-oscuro)' }}>
        Catálogo dinámico por canal de venta. Cada usuario ve los productos y precios de su canal.
      </p>
      <CatalogosClient
        canales={canales ?? []}
        configMap={configMap}
        pdfs={pdfs}
      />
    </div>
  )
}
