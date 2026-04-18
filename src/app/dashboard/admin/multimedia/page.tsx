import { createClient } from '@/lib/supabase/server'
import { MultimediaClient } from './MultimediaClient'

export default async function MultimediaPage() {
  const supabase = await createClient()

  const { data: productos } = await supabase
    .from('productos')
    .select('id, codigo_interno, titulo, categoria')
    .eq('activo', true)
    .order('titulo')

  const { data: todasLasFotos } = await supabase
    .from('producto_fotos')
    .select('id, producto_id, url, orden')
    .order('orden')

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Multimedia
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--color-acero-oscuro)' }}>
        Asociá fotos a productos del catálogo Gesu.
      </p>
      <MultimediaClient
        productos={productos ?? []}
        fotosIniciales={todasLasFotos ?? []}
        supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
        supabaseKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}
      />
    </div>
  )
}
