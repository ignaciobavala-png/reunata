import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Hero } from '@/components/sections/Hero'
import { CategoryBento } from '@/components/sections/CategoryBento'
import { InstagramSlider } from '@/components/sections/InstagramSlider'
import { ProductSlider } from '@/components/sections/ProductSlider'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()

  const { data: fotosDestacadas } = await supabase
    .from('producto_fotos')
    .select('id, url, producto_id, orden, productos(titulo, codigo_interno)')
    .eq('destacada', true)
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
        <CategoryBento />
        <ProductSlider fotos={fotos} />
        <InstagramSlider />
      </main>
      <Footer />
    </>
  )
}
