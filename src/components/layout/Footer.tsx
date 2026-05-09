import Link from 'next/link'
import { FadeIn } from '@/components/ui/FadeIn'
import { Camera, Share2, Play, Music } from 'lucide-react'

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

const empresaLinks = [
  { label: 'Nosotros',                href: '/nosotros' },
  { label: 'Próximos eventos',        href: '/eventos' },
  { label: 'Trabajá con nosotros',    href: '/trabaja-con-nosotros' },
  { label: 'Quiero ser distribuidor', href: '/distribuidores' },
  { label: 'Franquicias',             href: '/franquicias' },
  { label: 'Puntos de venta',         href: '/puntos-de-venta' },
]

const infoLinks = [
  { label: 'Descargar catálogo',      href: '/catalogo' },
  { label: 'Banco de imágenes',       href: '/banco-imagenes' },
  { label: 'Seguimiento de envíos',   href: '/seguimiento' },
  { label: 'Preguntas frecuentes',    href: '/faq' },
  { label: 'Términos y condiciones',  href: '/terminos' },
  { label: 'Políticas de devolución', href: '/politicas' },
  { label: 'Arrepentimiento',         href: '/arrepentimiento' },
]

const redes = [
  { label: 'Instagram', href: 'https://www.instagram.com/reunata.ar/', icon: Camera },
  { label: 'Facebook',  href: 'https://www.facebook.com/reunata.ar/',  icon: Share2 },
  { label: 'TikTok',    href: 'https://www.tiktok.com/@reunata.ar',    icon: Music },
  { label: 'YouTube',   href: 'https://www.youtube.com/@reunata.ar',   icon: Play },
]

const sectionLabel = 'text-[10px] tracking-[0.3em] uppercase text-[var(--color-acero-oscuro)] mb-4'
const linkClass = 'text-sm text-[var(--color-acero)] hover:text-[var(--color-acero-brillo)] transition-colors duration-200'

export function Footer() {
  return (
    <footer className="bg-[var(--color-granito-oscuro)] border-t border-[var(--color-granito-claro)] overflow-hidden">
      <FadeIn delay={0.1}>
        <div className="px-6 md:px-10 py-10 md:py-12 grid grid-cols-2 md:grid-cols-4 gap-8">

          {/* Tienda */}
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
              {empresaLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Información / Soporte */}
          <div>
            <p className={sectionLabel}>Información</p>
            <ul className="flex flex-col gap-2">
              {infoLinks.slice(0, 3).map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>{item.label}</Link>
                </li>
              ))}
            </ul>
            <p className={`${sectionLabel} mt-5`}>Soporte</p>
            <ul className="flex flex-col gap-2">
              {infoLinks.slice(3).map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacto + Newsletter + Redes */}
          <div>
            <p className={sectionLabel}>Contacto</p>
            <ul className="flex flex-col gap-2 mb-5">
              <li>
                <a
                  href="https://wa.me/5491132720974"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  WhatsApp
                </a>
              </li>
              <li>
                <p className="text-xs text-[var(--color-acero-oscuro)] leading-relaxed">
                  Donde estamos<br />
                  contacto@reunata.com.ar
                </p>
              </li>
              <li>
                <Link href="/contacto#opiniones" className={linkClass}>
                  Tu opinión nos importa
                </Link>
              </li>
            </ul>

            <p className={sectionLabel}>Newsletter</p>
            <p className="text-xs text-[var(--color-acero-oscuro)] mb-3 leading-relaxed">
              10% OFF en tu próxima compra
            </p>
            <form className="flex border border-[var(--color-granito-claro)] hover:border-[var(--color-acero-oscuro)] transition-colors duration-300 mb-5">
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

            <p className={sectionLabel}>Seguinos</p>
            <div className="flex gap-3">
              {redes.map((r) => (
                <a
                  key={r.label}
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={r.label}
                  className="w-8 h-8 rounded-full flex items-center justify-center border transition-colors duration-200 border-[var(--color-acero-oscuro)] text-[var(--color-acero)] hover:border-[var(--color-acero-brillo)] hover:text-[var(--color-acero-brillo)]"
                >
                  <r.icon size={14} strokeWidth={1.5} />
                </a>
              ))}
            </div>
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
