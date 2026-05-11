import { createServiceClient } from '@/lib/supabase/server'
import { InstagramClient } from './InstagramClient'

export default async function InstagramPage() {
  const supabase = createServiceClient()

  const { data: posts } = await supabase
    .from('comunidad_fotos')
    .select('*')
    .order('orden')

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Comunidad / Instagram
      </h1>
      <p className="text-base mb-8" style={{ color: 'var(--color-acero-oscuro)' }}>
        Subí imágenes para que se muestren en el carrusel de Comunidad en la página principal.
      </p>

      <InstagramClient posts={posts ?? []} />
    </div>
  )
}
