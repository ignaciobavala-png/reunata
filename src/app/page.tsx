import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Hero } from '@/components/sections/Hero'
import { CategoryBento } from '@/components/sections/CategoryBento'
import { InstagramSlider } from '@/components/sections/InstagramSlider'
import { ProductSlider } from '@/components/sections/ProductSlider'

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <CategoryBento />
        <ProductSlider />
        <InstagramSlider />
      </main>
      <Footer />
    </>
  )
}
