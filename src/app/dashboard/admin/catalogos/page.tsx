import { createServiceClient } from '@/lib/supabase/server'
import { CatalogosClient, type CatalogoItem } from './CatalogosClient'

export default async function CatalogosPage() {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('catalogos')
    .select('id, titulo, url, activo, created_at')
    .order('created_at', { ascending: false })

  const catalogos: CatalogoItem[] = await Promise.all(
    (data ?? []).map(async (c) => {
      const { data: signed } = await supabase.storage
        .from('catalogos')
        .createSignedUrl(c.url, 60 * 60) // 1 hora
      return { ...c, signedUrl: signed?.signedUrl ?? '' }
    })
  )

  return (
    <div className="p-8 max-w-3xl">
      <h1
        className="text-2xl mb-1"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}
      >
        Catálogos
      </h1>
      <p className="text-base mb-8" style={{ color: 'var(--color-acero-oscuro)' }}>
        PDFs y listas de precios disponibles para mayoristas y corporativos.
      </p>
      <CatalogosClient catalogos={catalogos} />
    </div>
  )
}
