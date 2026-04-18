import Link from 'next/link'
import { notFound } from 'next/navigation'

const SLUGS: Record<string, string> = {
  'materas-y-mochilas':  'Materas y Mochilas',
  'mates':               'Mates',
  'bombillas-y-sorbetes':'Bombillas y Sorbetes',
  'accesorios':          'Accesorios para el mate',
  'termicos-de-acero':   'Térmicos de Acero',
  'merchandising':       'Merchandising y Promocionales',
  'cocina':              'Para la cocina',
  'gift-card':           'Gift Card',
}

export function generateStaticParams() {
  return Object.keys(SLUGS).map(slug => ({ slug }))
}

export default async function CategoriaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const nombre = SLUGS[slug]
  if (!nombre) notFound()

  return (
    <main className="pt-32 pb-24 px-6 md:px-16 max-w-5xl mx-auto">

      <Link
        href="/tienda"
        className="text-xs tracking-widest uppercase mb-8 inline-flex items-center gap-2 transition-colors duration-150"
        style={{ color: 'var(--color-acero-oscuro)' }}
      >
        ← Tienda
      </Link>

      <h1
        className="text-4xl md:text-5xl leading-tight mb-4 mt-4"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}
      >
        {nombre}
      </h1>
      <p className="text-base max-w-xl leading-relaxed mb-14" style={{ color: 'var(--color-granito-claro)' }}>
        Catálogo mayorista exclusivo para clientes registrados y aprobados.
      </p>

      {/* Placeholder — el catálogo real requiere login */}
      <div
        className="rounded-2xl border p-12 text-center"
        style={{ borderColor: 'var(--color-acero-claro)', background: 'var(--color-acero-brillo)' }}
      >
        <p className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
          Contenido exclusivo para clientes mayoristas
        </p>
        <p className="text-xs mb-6" style={{ color: 'var(--color-acero-oscuro)' }}>
          Registrate o ingresá para ver precios, stock y hacer pedidos de {nombre.toLowerCase()}.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/login"
            className="px-6 py-2.5 rounded-full text-sm"
            style={{ background: 'var(--foreground)', color: 'var(--color-acero-brillo)' }}
          >
            Ingresar
          </Link>
          <Link
            href="/trabaja-con-nosotros"
            className="px-6 py-2.5 rounded-full text-sm border"
            style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
          >
            Quiero ser cliente
          </Link>
        </div>
      </div>
    </main>
  )
}
