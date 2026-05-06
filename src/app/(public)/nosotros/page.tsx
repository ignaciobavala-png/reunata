import Link from 'next/link'

const valores = [
  {
    numero: '01',
    titulo: 'Selección rigurosa',
    texto: 'Cada producto que lleva la marca Reunata pasó por nuestra revisión. No trabajamos con intermediarios que no conocemos.',
  },
  {
    numero: '02',
    titulo: 'Mayorista de verdad',
    texto: 'Pensamos en el revendedor, en el local, en el distribuidor. Nuestras condiciones están diseñadas para hacer crecer el negocio de nuestros clientes.',
  },
  {
    numero: '03',
    titulo: 'Relación directa',
    texto: 'No hay call center. Hay personas. Tu vendedor conoce tu negocio y trabaja contigo a largo plazo.',
  },
]

const categorias = [
  { label: 'Mates',                   href: '/tienda/mates' },
  { label: 'Térmicos de acero',       href: '/tienda/termicos-de-acero' },
  { label: 'Bombillas y sorbetes',    href: '/tienda/bombillas-y-sorbetes' },
  { label: 'Materas y mochilas',      href: '/tienda/materas-y-mochilas' },
  { label: 'Accesorios para el mate', href: '/tienda/accesorios' },
  { label: 'Para la cocina',          href: '/tienda/cocina' },
  { label: 'Merchandising',           href: '/tienda/merchandising' },
  { label: 'Gift Card',               href: '/tienda/gift-card' },
]

export default function NosotrosPage() {
  return (
    <main className="bg-[var(--color-acero-claro)]">
      <div className="px-6 md:px-16 max-w-5xl mx-auto">

        {/* Hero */}
        <section className="pt-28 pb-16 border-b-2 border-[var(--color-granito-claro)]">
          <p className="text-xs tracking-widest uppercase mb-4 text-[var(--color-granito-oscuro)]">
            Quiénes somos
          </p>
          <h1
            className="text-4xl md:text-6xl leading-tight mb-6 text-[var(--color-granito-oscuro)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            El mate como cultura,<br />el acero como filosofía.
          </h1>
          <p className="text-base max-w-2xl leading-relaxed text-[var(--color-granito-oscuro)]">
            Reunata nació de una convicción simple: el ritual del mate merece productos a la altura.
            Importamos y distribuimos equipamiento de calidad real — sin folklore, sin excesos.
            Diseño que dura, materiales que importan.
          </p>
        </section>

        {/* Cómo trabajamos */}
        <section className="py-14 border-b-2 border-[var(--color-granito-claro)]">
          <p className="text-xs tracking-widest uppercase mb-8 text-[var(--color-granito-oscuro)]">
            Cómo trabajamos
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {valores.map((v) => (
              <div
                key={v.numero}
                className="flex flex-col gap-3 p-6 border-2 border-[var(--color-granito-claro)] bg-white rounded-xl hover:border-[var(--color-acero-oscuro)] transition-colors duration-200"
              >
                <span className="text-xs font-mono text-[var(--color-acero-oscuro)]">{v.numero}</span>
                <h3 className="text-base font-semibold text-[var(--color-granito-oscuro)]">{v.titulo}</h3>
                <p className="text-sm leading-relaxed text-[var(--color-granito-oscuro)]">{v.texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Lo que distribuimos */}
        <section className="py-14 border-b-2 border-[var(--color-granito-claro)]">
          <p className="text-xs tracking-widest uppercase mb-8 text-[var(--color-granito-oscuro)]">
            Lo que distribuimos
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {categorias.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="group flex items-center justify-between px-4 py-4 border-2 border-[var(--color-granito-claro)] bg-white rounded-xl text-sm text-[var(--color-granito-oscuro)] hover:border-[var(--color-acero-oscuro)] hover:bg-white transition-all duration-200"
              >
                <span>{cat.label}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">→</span>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-14 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
          <div className="flex-1">
            <p className="text-lg font-semibold text-[var(--color-granito-oscuro)] mb-1">¿Querés ser parte?</p>
            <p className="text-sm text-[var(--color-granito-oscuro)] leading-relaxed">
              Trabajamos con distribuidores, locales y revendedores de todo el país.
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Link
              href="/trabaja-con-nosotros"
              className="px-6 py-3 text-sm bg-[var(--color-granito-oscuro)] text-white rounded-full hover:bg-[var(--color-granito)] transition-colors duration-200 font-medium"
            >
              Trabajá con nosotros
            </Link>
            <Link
              href="/contacto"
              className="px-6 py-3 text-sm border-2 border-[var(--color-granito-claro)] bg-white text-[var(--color-granito-oscuro)] rounded-full hover:border-[var(--color-acero-oscuro)] transition-colors duration-200"
            >
              Contacto
            </Link>
          </div>
        </section>

      </div>
    </main>
  )
}
