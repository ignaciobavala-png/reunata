import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export default function HotSalePage() {
  const productos = [
    { id: 1, titulo: 'Mate Steel Pro', descuento: 30, precio: 42, antes: 60, img: '/fotos/hero1.jpg' },
    { id: 2, titulo: 'Termo Ultra', descuento: 25, precio: 75, antes: 100, img: '/fotos/hero1.jpg' },
    { id: 3, titulo: 'Kit Mate Premium', descuento: 40, precio: 90, antes: 150, img: '/fotos/hero1.jpg' },
  ]

  return (
    <>
      <Header />
      <main className="flex-1 pt-24 pb-24 px-6 md:px-16">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-5xl mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
            🔥 Hot Sale
          </h1>
          <p className="text-lg mb-12" style={{ color: 'var(--color-acero-oscuro)' }}>
            Ofertas por tiempo limitado. ¡No te lo pierdan!
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {productos.map((p) => (
              <div key={p.id} className="border rounded-lg overflow-hidden border-red-500">
                <div className="aspect-square bg-gray-200 relative">
                  <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                    HOT
                  </div>
                  <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
                    -{p.descuento}%
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-medium mb-2">{p.titulo}</h3>
                  <div className="flex gap-2 items-center">
                    <span className="text-lg font-bold">${p.precio}</span>
                    <span className="text-sm text-gray-400 line-through">${p.antes}</span>
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