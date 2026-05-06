import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Hero } from '@/components/sections/Hero'
import { CategoryGallery } from '@/components/sections/CategoryGallery'
import { InstagramSlider } from '@/components/sections/InstagramSlider'
import { ProductSlider } from '@/components/sections/ProductSlider'
import { PromoTicker } from '@/components/sections/PromoTicker'
import { createServiceClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = createServiceClient()

  // Obtener IDs de productos visibles en el canal público
  const { data: canalPublico } = await supabase
    .from('canales')
    .select('id')
    .eq('slug', 'publico')
    .single()

  const { data: publicoAsignaciones } = canalPublico
    ? await supabase.from('producto_canales').select('producto_id').eq('canal_id', canalPublico.id)
    : { data: [] }

  const idsPublicos = (publicoAsignaciones ?? []).map(a => a.producto_id)

  const { data: fotosDestacadas } = await supabase
    .from('producto_fotos')
    .select('id, url, producto_id, orden, productos(titulo, codigo_interno)')
    .eq('destacada', true)
    .in('producto_id', idsPublicos.length > 0 ? idsPublicos : [-1])
    .order('orden')

  const fotos = (fotosDestacadas ?? []).map((f) => {
    const productos = f.productos as { titulo: string; codigo_interno: string }[] | null
    const producto = productos?.[0] ?? null
    return {
      id: f.id,
      url: f.url,
      producto_id: f.producto_id,
      titulo: producto?.titulo ?? '',
      codigo_interno: producto?.codigo_interno ?? '',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    }
  })

  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <CategoryGallery />
        <PromoTicker />
        <ProductSlider fotos={fotos} />
        <InstagramSlider />
      </main>
      <Footer />
    </>
  )
}
