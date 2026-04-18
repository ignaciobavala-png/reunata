import Link from 'next/link'

const categorias = [
  { label: 'Materas y Mochilas',           href: '/tienda/materas-y-mochilas',  emoji: '🎒' },
  { label: 'Mates',                          href: '/tienda/mates',               emoji: '🧉' },
  { label: 'Bombillas y Sorbetes',          href: '/tienda/bombillas-y-sorbetes',emoji: '🥢' },
  { label: 'Accesorios para el mate',       href: '/tienda/accesorios',          emoji: '✨' },
  { label: 'Térmicos de Acero',             href: '/tienda/termicos-de-acero',   emoji: '🥤' },
  { label: 'Merchandising y Promocionales', href: '/tienda/merchandising',       emoji: '🎁' },
  { label: 'Para la cocina',                href: '/tienda/cocina',              emoji: '🍵' },
  { label: 'Gift Card',                     href: '/tienda/gift-card',           emoji: '💳' },
]

export default function TiendaPage() {
  return (
    <main className="pt-32 pb-24 px-6 md:px-16 max-w-5xl mx-auto">
      <p className="text-xs tracking-widest uppercase mb-4" style={{ color: 'var(--color-acero-oscuro)' }}>
        Catálogo mayorista
      </p>
      <h1
        className="text-4xl md:text-5xl leading-tight mb-4"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}
      >
        Nuestros productos
      </h1>
      <p className="text-base max-w-xl leading-relaxed mb-14" style={{ color: 'var(--color-granito-claro)' }}>
        Catálogo mayorista exclusivo para clientes registrados. Los precios y el stock se muestran una vez aprobada tu cuenta.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-14">
        {categorias.map(cat => (
          <Link
            key={cat.href}
            href={cat.href}
            className="group rounded-2xl border px-5 py-6 flex flex-col gap-3 transition-colors duration-200 hover:border-[var(--color-granito)]"
            style={{ borderColor: 'var(--color-acero-claro)', background: 'white' }}
          >
            <span className="text-2xl">{cat.emoji}</span>
            <span className="text-sm leading-snug" style={{ color: 'var(--foreground)' }}>{cat.label}</span>
          </Link>
        ))}
      </div>

      <div
        className="rounded-2xl border p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        style={{ borderColor: 'var(--color-acero-claro)', background: 'var(--color-acero-brillo)' }}
      >
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            ¿Sos revendedor o distribuidor?
          </p>
          <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
            Registrate para ver precios mayoristas, stock en tiempo real y hacer pedidos desde la plataforma.
          </p>
        </div>
        <Link
          href="/login"
          className="flex-shrink-0 px-6 py-2.5 rounded-full text-sm whitespace-nowrap"
          style={{ background: 'var(--foreground)', color: 'var(--color-acero-brillo)' }}
        >
          Crear cuenta
        </Link>
      </div>
    </main>
  )
}
