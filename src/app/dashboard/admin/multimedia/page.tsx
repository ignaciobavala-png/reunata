import { createClient } from '@/lib/supabase/server'
import { MultimediaClient } from './MultimediaClient'
import { CategoriasClient } from './CategoriasClient'

export default async function MultimediaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const vistaActual = tab === 'categorias' ? 'categorias' : 'fotos'

  const supabase = await createClient()

  const [{ data: productos }, { data: todasLasFotos }, { data: categorias }] = await Promise.all([
    supabase
      .from('productos')
      .select('id, codigo_interno, titulo, categoria')
      .eq('activo', true)
      .order('titulo'),
    supabase
      .from('producto_fotos')
      .select('id, producto_id, url, orden, destacada')
      .order('orden'),
    supabase
      .from('categorias_home')
      .select('id, nombre, descripcion, href, activo, categoria_keys')
      .order('orden'),
  ])

  return (
    <div className="p-8 h-full flex flex-col">
      <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Multimedia
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--color-acero-oscuro)' }}>
        Gestioná fotos de productos y categorías de la página principal.
      </p>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b" style={{ borderColor: 'var(--color-acero-claro)' }}>
        {[
          { key: 'fotos', label: 'Fotos de productos' },
          { key: 'categorias', label: 'Categorías home' },
        ].map(({ key, label }) => (
          <a
            key={key}
            href={key === 'fotos' ? '?' : '?tab=categorias'}
            className="px-4 py-2 text-sm transition-colors duration-150 border-b-2 -mb-px"
            style={{
              borderColor: vistaActual === key ? 'var(--color-granito)' : 'transparent',
              color: vistaActual === key ? 'var(--foreground)' : 'var(--color-acero-oscuro)',
            }}
          >
            {label}
          </a>
        ))}
      </div>

      {vistaActual === 'fotos' ? (
        <MultimediaClient
          productos={productos ?? []}
          fotosIniciales={todasLasFotos ?? []}
          supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
          supabaseKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}
        />
      ) : (
        <CategoriasClient categoriasIniciales={categorias ?? []} />
      )}
    </div>
  )
}
