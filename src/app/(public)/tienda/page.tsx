import Link from 'next/link'

const categorias = [
  { label: 'Materas y Mochilas',           href: '/tienda/materas-y-mochilas',   numero: '01' },
  { label: 'Mates',                          href: '/tienda/mates',                numero: '02' },
  { label: 'Bombillas y Sorbetes',          href: '/tienda/bombillas-y-sorbetes', numero: '03' },
  { label: 'Accesorios para el mate',       href: '/tienda/accesorios',           numero: '04' },
  { label: 'Térmicos de Acero',             href: '/tienda/termicos-de-acero',    numero: '05' },
  { label: 'Merchandising y Promocionales', href: '/tienda/merchandising',        numero: '06' },
  { label: 'Para la cocina',                href: '/tienda/cocina',               numero: '07' },
  { label: 'Gift Card',                     href: '/tienda/gift-card',            numero: '08' },
]

export default function TiendaPage() {
  return (
    <main className="bg-[var(--color-granito-oscuro)] pb-24">
      <div className="px-6 md:px-16 max-w-5xl mx-auto">

        {/* Hero */}
        <section className="pt-36 pb-20 border-b border-[var(--color-granito)]">
          <p className="text-xs tracking-widest uppercase mb-5 text-[var(--color-acero-oscuro)]">
            Catálogo mayorista
          </p>
          <h1
            className="text-4xl md:text-5xl leading-tight mb-8 text-[var(--color-acero-brillo)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Nuestros productos
          </h1>
          <p className="text-lg max-w-xl leading-relaxed text-[var(--color-acero)]">
            Catálogo mayorista exclusivo para clientes registrados. Los precios y el stock se muestran una vez aprobada tu cuenta.
          </p>
        </section>

        {/* Categorías */}
        <section className="py-20 border-b border-[var(--color-granito)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {categorias.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="group flex flex-col justify-between px-5 py-6 border border-[var(--color-granito)] rounded-xl hover:border-[var(--color-granito-claro)] hover:bg-[var(--color-granito)] transition-all duration-200"
              >
                <span className="text-xs font-mono text-[var(--color-acero-oscuro)] mb-8">{cat.numero}</span>
                <div className="flex items-end justify-between">
                  <span className="text-base text-[var(--color-acero)] group-hover:text-[var(--color-acero-brillo)] transition-colors duration-200 leading-snug">
                    {cat.label}
                  </span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[var(--color-acero-oscuro)] text-sm ml-2">→</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="text-xl font-medium text-[var(--color-acero-brillo)] mb-2">
              ¿Sos revendedor o distribuidor?
            </p>
            <p className="text-base text-[var(--color-acero)] leading-relaxed">
              Registrate para ver precios mayoristas, stock en tiempo real y hacer pedidos desde la plataforma.
            </p>
          </div>
          <Link
            href="/registro"
            className="flex-shrink-0 px-6 py-3 text-sm bg-[var(--color-acero-brillo)] text-[var(--color-granito-oscuro)] rounded-full hover:bg-[var(--color-acero-claro)] transition-colors duration-200 font-medium"
          >
            Crear cuenta
          </Link>
        </section>

      </div>
    </main>
  )
}
