import { createClient } from '@/lib/supabase/server'
import { HeroCarousel } from './HeroCarousel'
import { Hero as HeroFallback } from './HeroFallback'

export async function Hero() {
  const supabase = await createClient()

  const { data: assets } = await supabase
    .from('hero_assets')
    .select('*')
    .eq('activo', true)
    .order('orden')

  if (assets && assets.length > 0) {
    return <HeroCarousel assets={assets} supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!} />
  }

  return <HeroFallback />
}
