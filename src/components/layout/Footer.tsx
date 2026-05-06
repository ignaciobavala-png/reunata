import Link from 'next/link'
import { FadeIn } from '@/components/ui/FadeIn'

const tienda = [
  { label: 'Todos los productos',     href: '/tienda' },
  { label: 'Mates',                   href: '/tienda/mates' },
  { label: 'Térmicos de acero',       href: '/tienda/termicos-de-acero' },
  { label: 'Bombillas y sorbetes',    href: '/tienda/bombillas-y-sorbetes' },
  { label: 'Materas y mochilas',      href: '/tienda/materas-y-mochilas' },
  { label: 'Accesorios para el mate', href: '/tienda/accesorios' },
  { label: 'Merchandising',           href: '/tienda/merchandising' },
  { label: 'Gift Card',               href: '/tienda/gift-card' },
]

const empresa = [
  { label: 'Nosotros',             href: '/nosotros' },
  { label: 'Trabajá con nosotros', href: '/trabaja-con-nosotros' },
  { label: 'Contacto',             href: '/contacto' },
  { label: 'Instagram',            href: 'https://www.instagram.com/reunata.ar/', external: true },
  { label: 'WhatsApp',             href: 'https://wa.me/5491132720974', external: true },
]

const cuenta = [
  { label: 'Ingresá',      href: '/login' },
  { label: 'Registrate',   href: '/registro' },
  { label: 'Mi catálogo',  href: '/dashboard/cliente/catalogo' },
  { label: 'Mis pedidos',  href: '/dashboard/cliente/pedidos' },
]

const sectionLabel = 'text-[10px] tracking-[0.3em] uppercase text-[var(--color-acero-oscuro)] mb-4'
const linkClass = 'text-sm text-[var(--color-acero)] hover:text-[var(--color-acero-brillo)] transition-colors duration-200'

export function Footer() {
  return (
    <footer className="bg-[var(--color-granito-oscuro)] border-t border-[var(--color-granito-claro)] overflow-hidden">
      <FadeIn delay={0.1}>
        <div className="px-6 md:px-10 py-10 md:py-12 grid grid-cols-2 md:grid-cols-4 gap-8">

          {/* Tienda — 2 columnas internas para reducir altura */}
          <div className="col-span-2 md:col-span-1">
            <p className={sectionLabel}>Tienda</p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
              {tienda.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Empresa */}
          <div>
            <p className={sectionLabel}>Empresa</p>
            <ul className="flex flex-col gap-2">
              {empresa.map((item) => (
                <li key={item.href}>
                  <Link 
                    href={item.href} 
                    {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className={linkClass}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Cuenta */}
          <div>
            <p className={sectionLabel}>Mi cuenta</p>
            <ul className="flex flex-col gap-2">
              {cuenta.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <p className={sectionLabel}>Newsletter</p>
            <p className="text-sm text-[var(--color-acero-oscuro)] mb-3 leading-relaxed">
              Novedades y cultura del mate.
            </p>
            <form className="flex border border-[var(--color-granito-claro)] hover:border-[var(--color-acero-oscuro)] transition-colors duration-300">
              <input
                type="email"
                placeholder="tu@email.com"
                className="flex-1 px-3 py-2.5 bg-transparent text-xs outline-none text-[var(--color-acero-brillo)] placeholder:text-[var(--color-granito-claro)]"
              />
              <button
                type="submit"
                className="px-3 py-2.5 text-[10px] tracking-widest uppercase bg-[var(--color-acero-oscuro)] text-[var(--color-granito-oscuro)] hover:bg-[var(--color-acero)] transition-colors duration-200 whitespace-nowrap"
              >
                OK
              </button>
            </form>
          </div>

        </div>
      </FadeIn>

      {/* Bottom bar */}
      <div className="px-6 md:px-10 py-4 border-t border-[var(--color-granito-claro)]">
        <p className="text-[10px] text-[var(--color-acero-oscuro)] tracking-wider">
          © {new Date().getFullYear()} Reunata. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  )
}
