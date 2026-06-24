import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { CorporativosClient } from './CorporativosClient'

export default async function CorporativosPage() {
  const supabase = await createClient()
  const serviceSupabase = createServiceClient()

  const { data: corporativos } = await supabase
    .from('corporativos')
    .select('*')
    .order('created_at', { ascending: false })

  const withSignedUrls = await Promise.all(
    (corporativos ?? []).map(async (c) => {
      if (!c.logo_url) return { ...c, logo_signed_url: null }
      const { data } = await serviceSupabase.storage
        .from('corporativos')
        .createSignedUrl(c.logo_url, 3600)
      return { ...c, logo_signed_url: data?.signedUrl ?? null }
    })
  )

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Corporativos
      </h1>
      <p className="text-base mb-8" style={{ color: 'var(--color-acero-oscuro)' }}>
        Solicitudes de regalos corporativos recibidas desde el formulario público.
      </p>
      <CorporativosClient corporativos={withSignedUrls as Parameters<typeof CorporativosClient>[0]['corporativos']} />
    </div>
  )
}
