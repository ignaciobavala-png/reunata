import { createClient } from '@/lib/supabase/server'
import { CorporativosClient } from './CorporativosClient'

export default async function CorporativosPage() {
  const supabase = await createClient()

  const { data: corporativos } = await supabase
    .from('corporativos')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Corporativos
      </h1>
      <p className="text-base mb-8" style={{ color: 'var(--color-acero-oscuro)' }}>
        Solicitudes de regalos corporativos recibidas desde el formulario público.
      </p>
      <CorporativosClient corporativos={(corporativos ?? []) as Parameters<typeof CorporativosClient>[0]['corporativos']} />
    </div>
  )
}
