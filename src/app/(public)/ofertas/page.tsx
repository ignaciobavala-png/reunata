import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export default function OfertasPage() {
  const ofertas = [
    { id: 1, titulo: 'Mate Imperial', descuento: 20, precio: 45, antes: 56, img: '/fotos/hero1.jpg' },
    { id: 2, titulo: 'Matera Classic', descuento: 15, precio: 32, antes: 38, img: '/fotos/hero1.jpg' },
    { id: 3, titulo: 'Combo Yerba', descuento: 10, precio: 18, antes: 20, img: '/fotos/hero1.jpg' },
  ]

  return (
    <>
      <Header />
      <main className="flex-1 pt-24 pb-24 px-6 md:px-16">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-5xl mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
            Ofertas
          </h1>
          <p className="text-lg mb-12" style={{ color: 'var(--color-acero-oscuro)' }}>
            Aprovechá las mejores ofertas en productos seleccionados.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {ofertas.map((o) => (
              <div key={o.id} className="border rounded-lg overflow-hidden">
                <div className="aspect-square bg-gray-200 relative">
                  <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded">
                    -{o.descuento}%
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-medium mb-2">{o.titulo}</h3>
                  <div className="flex gap-2 items-center">
                    <span className="text-lg font-bold">${o.precio}</span>
                    <span className="text-sm text-gray-400 line-through">${o.antes}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}