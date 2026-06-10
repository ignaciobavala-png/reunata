import { createClient } from '@/lib/supabase/server'
import { HeroCarousel } from './HeroCarousel'
import { Hero as HeroFallback } from './HeroFallback'

const HERO_FALLBACK_KEYS = [
  'hero_fallback_etiqueta',
  'hero_fallback_titulo',
  'hero_fallback_subtitulo',
  'hero_fallback_boton_texto',
  'hero_fallback_boton_url',
] as const

export const HERO_DEFAULTS = {
  hero_fallback_etiqueta: 'Nueva Colección',
  hero_fallback_titulo: 'El mate que te une.',
  hero_fallback_subtitulo: 'Productos importados, diseñados para quienes toman el mate en serio. Acero, granito y tradición en cada pieza.',
  hero_fallback_boton_texto: 'Ver tienda',
  hero_fallback_boton_url: '/tienda',
}

export type HeroFallbackConfig = {
  etiqueta: string
  titulo: string
  subtitulo: string
  boton_texto: string
  boton_url: string
}

export async function Hero() {
  const supabase = await createClient()

  const [{ data: assets }, { data: configRows }] = await Promise.all([
    supabase.from('hero_assets').select('*').eq('activo', true).order('orden'),
    supabase.from('configuracion').select('clave, valor').in('clave', [...HERO_FALLBACK_KEYS]),
  ])

  const cfg: Record<string, string> = {}
  for (const row of configRows ?? []) cfg[row.clave] = row.valor

  const fallback: HeroFallbackConfig = {
    etiqueta: cfg.hero_fallback_etiqueta ?? HERO_DEFAULTS.hero_fallback_etiqueta,
    titulo: cfg.hero_fallback_titulo ?? HERO_DEFAULTS.hero_fallback_titulo,
    subtitulo: cfg.hero_fallback_subtitulo ?? HERO_DEFAULTS.hero_fallback_subtitulo,
    boton_texto: cfg.hero_fallback_boton_texto ?? HERO_DEFAULTS.hero_fallback_boton_texto,
    boton_url: cfg.hero_fallback_boton_url ?? HERO_DEFAULTS.hero_fallback_boton_url,
  }

  if (assets && assets.length > 0) {
    return <HeroCarousel assets={assets} supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!} fallback={fallback} />
  }

  return <HeroFallback {...fallback} />
}
