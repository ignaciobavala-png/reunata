import { createClient } from '@/lib/supabase/server'
import { PostulacionesClient } from './PostulacionesClient'

export default async function PostulacionesPage() {
  const supabase = await createClient()

  const { data: postulaciones } = await supabase
    .from('postulaciones')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Postulaciones
      </h1>
      <p className="text-base mb-8" style={{ color: 'var(--color-acero-oscuro)' }}>
        Revisá las postulaciones de &quot;Trabaja con nosotros&quot;. Aprobalas o rechazalas.
      </p>
      <PostulacionesClient postulaciones={(postulaciones ?? []) as Parameters<typeof PostulacionesClient>[0]['postulaciones']} />
    </div>
  )
}
