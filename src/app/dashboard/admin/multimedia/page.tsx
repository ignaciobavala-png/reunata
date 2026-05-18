import { createClient } from '@/lib/supabase/server'
import { MultimediaClient } from './MultimediaClient'
import { CategoriasClient } from './CategoriasClient'
import { HeroClient } from './HeroClient'
import { DisenoClient } from './DisenoClient'
import { PromoClient } from './PromoClient'
import { BannerClient } from './BannerClient'
import { CorporativosClient } from './CorporativosClient'

export default async function MultimediaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const vistaActual = tab === 'categorias' ? 'categorias' : tab === 'hero' ? 'hero' : tab === 'diseno' ? 'diseno' : tab === 'promo' ? 'promo' : tab === 'banner' ? 'banner' : tab === 'corporativos' ? 'corporativos' : 'fotos'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user ? await supabase.from('profiles').select('rol').eq('id', user.id).single() : { data: null }
  const isMaster = profile?.rol === 'master'

  const [{ data: productos }, { data: todasLasFotos }, { data: categorias }, { data: heroAssets }, { data: gesuCatsRaw }] = await Promise.all([
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
      .select('id, nombre, descripcion, href, activo, categoria_keys, foto_url')
      .order('orden'),
    supabase
      .from('hero_assets')
      .select('*')
      .order('orden'),
    supabase
      .from('productos')
      .select('categoria')
      .eq('activo', true)
      .not('categoria', 'is', null),
  ])

  const gesuCategorias = [...new Set((gesuCatsRaw ?? []).map(p => p.categoria as string).filter(Boolean))].sort()

  return (
    <div className="p-8 h-full flex flex-col">
      <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Multimedia
      </h1>
      <p className="text-base mb-6" style={{ color: 'var(--color-acero-oscuro)' }}>
        Gestioná fotos de productos, categorías, banner y diseño de la página principal.
      </p>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b" style={{ borderColor: 'var(--color-acero-claro)' }}>
        {[
          { key: 'fotos', label: 'Fotos de productos' },
          { key: 'categorias', label: 'Categorías home' },
          { key: 'hero', label: 'Hero' },
          { key: 'banner', label: 'Banner promocional' },
          { key: 'diseno', label: 'Diseño' },
          { key: 'promo', label: 'Cinta promocional' },
          { key: 'corporativos', label: 'Corporativos' },
        ].map(({ key, label }) => (
          <a
            key={key}
            href={key === 'fotos' ? '?' : `?tab=${key}`}
            className="px-4 py-2 text-base transition-colors duration-150 border-b-2 -mb-px"
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
          isMaster={isMaster}
        />
      ) : vistaActual === 'hero' ? (
        <HeroClient
          assetsIniciales={(heroAssets ?? []) as any}
          supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
          supabaseKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}
          isMaster={isMaster}
        />
      ) : vistaActual === 'diseno' ? (
        <DisenoClient />
      ) : vistaActual === 'banner' ? (
        <BannerClient supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!} />
      ) : vistaActual === 'promo' ? (
        <PromoClient />
      ) : vistaActual === 'corporativos' ? (
        <CorporativosClient supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!} />
      ) : (
        <CategoriasClient categoriasIniciales={categorias ?? []} isMaster={isMaster} gesuCategorias={gesuCategorias} />
      )}
    </div>
  )
}
