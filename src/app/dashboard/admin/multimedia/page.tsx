import { createClient } from '@/lib/supabase/server'
import { CategoriasClient } from './CategoriasClient'
import { HeroClient } from './HeroClient'
import { DisenoClient } from './DisenoClient'
import { PromoClient } from './PromoClient'
import { CorporativosClient } from './CorporativosClient'
import { HERO_DEFAULTS } from '@/components/sections/Hero'

export default async function MultimediaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const vistaActual = tab === 'hero' || tab === 'banner' ? 'hero' : tab === 'diseno' ? 'diseno' : tab === 'promo' ? 'promo' : tab === 'corporativos' ? 'corporativos' : 'categorias'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user ? await supabase.from('profiles').select('rol').eq('id', user.id).single() : { data: null }
  const isMaster = profile?.rol === 'master'

  const [{ data: categorias }, { data: heroAssets }, { data: gesuCatsRaw }, { data: heroConfig }] = await Promise.all([
    supabase
      .from('categorias_home')
      .select('id, nombre, descripcion, href, activo, categoria_keys, foto_url, orden')
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
    supabase
      .from('configuracion')
      .select('clave, valor')
      .in('clave', ['hero_fallback_etiqueta', 'hero_fallback_titulo', 'hero_fallback_subtitulo', 'hero_fallback_boton_texto', 'hero_fallback_boton_url']),
  ])

  const heroConfigMap: Record<string, string> = {}
  for (const row of heroConfig ?? []) heroConfigMap[row.clave] = row.valor

  const heroFallbackInicial = {
    etiqueta: heroConfigMap.hero_fallback_etiqueta ?? HERO_DEFAULTS.hero_fallback_etiqueta,
    titulo: heroConfigMap.hero_fallback_titulo ?? HERO_DEFAULTS.hero_fallback_titulo,
    subtitulo: heroConfigMap.hero_fallback_subtitulo ?? HERO_DEFAULTS.hero_fallback_subtitulo,
    boton_texto: heroConfigMap.hero_fallback_boton_texto ?? HERO_DEFAULTS.hero_fallback_boton_texto,
    boton_url: heroConfigMap.hero_fallback_boton_url ?? HERO_DEFAULTS.hero_fallback_boton_url,
  }

  const gesuCategorias = [...new Set((gesuCatsRaw ?? []).map(p => p.categoria as string).filter(Boolean))].sort()

  return (
    <div className="p-8 h-full flex flex-col">
      <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Multimedia
      </h1>
      <p className="text-base mb-6" style={{ color: 'var(--color-acero-oscuro)' }}>
        Gestioná categorías, banner, hero y diseño de la página principal.
      </p>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b" style={{ borderColor: 'var(--color-acero-claro)' }}>
        {[
          { key: 'categorias', label: 'Categorías home' },
          { key: 'hero', label: 'Hero & Banner' },
          { key: 'diseno', label: 'Diseño' },
          { key: 'promo', label: 'Cinta promocional' },
          { key: 'corporativos', label: 'Fotos de páginas' },
        ].map(({ key, label }) => (
          <a
            key={key}
            href={key === 'categorias' ? '?' : `?tab=${key}`}
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

      {vistaActual === 'hero' ? (
        <HeroClient
          assetsIniciales={(heroAssets ?? []) as any}
          supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
          supabaseKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}
          isMaster={isMaster}
          initialSubtab={tab === 'banner' ? 'banner' : 'carrusel'}
          fallbackInicial={heroFallbackInicial}
        />
      ) : vistaActual === 'diseno' ? (
        <DisenoClient />
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
