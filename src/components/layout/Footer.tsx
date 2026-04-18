import Link from 'next/link'
import { FadeIn } from '@/components/ui/FadeIn'

const links = {
  Tienda: [
    { label: 'Todos los productos', href: '/tienda' },
    { label: 'Mates', href: '/tienda/mates' },
    { label: 'Termos', href: '/tienda/termos' },
    { label: 'Bombillas', href: '/tienda/bombillas' },
  ],
  Ayuda: [
    { label: 'Envíos', href: '/envios' },
    { label: 'Devoluciones', href: '/devoluciones' },
    { label: 'Preguntas frecuentes', href: '/faq' },
    { label: 'Contacto', href: '/contacto' },
  ],
  Marca: [
    { label: 'Nosotros', href: '/nosotros' },
    { label: 'Prensa', href: '/prensa' },
    { label: 'Mayoristas', href: '/mayoristas' },
    { label: 'Instagram', href: 'https://instagram.com/reunata_ar' },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] overflow-hidden">
      {/* Links + newsletter */}
      <FadeIn delay={0.1}>
        <div className="px-6 md:px-10 py-16 md:py-20 grid grid-cols-2 md:grid-cols-4 gap-10">
          {Object.entries(links).map(([section, items]) => (
            <div key={section}>
              <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--color-acero-oscuro)] mb-5">
                {section}
              </p>
              <ul className="flex flex-col gap-3">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-[var(--color-granito-claro)] hover:text-[var(--foreground)] transition-colors duration-200"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Newsletter */}
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--color-acero-oscuro)] mb-5">
              Newsletter
            </p>
            <p className="text-sm text-[var(--color-granito-claro)] mb-4 leading-relaxed">
              Novedades, lanzamientos y cultura del mate.
            </p>
            <form className="flex border border-[var(--border)] hover:border-[var(--foreground)] transition-colors duration-300">
              <input
                type="email"
                placeholder="tu@email.com"
                className="flex-1 px-4 py-3 bg-transparent text-xs outline-none text-[var(--foreground)] placeholder:text-[var(--color-acero)]"
              />
              <button
                type="submit"
                className="px-4 py-3 text-[10px] tracking-widest uppercase bg-[var(--foreground)] text-[var(--color-acero-brillo)] hover:bg-[var(--color-granito)] transition-colors duration-200 whitespace-nowrap"
              >
                OK
              </button>
            </form>
          </div>
        </div>
      </FadeIn>

      {/* Bottom bar */}
      <div className="px-6 md:px-10 py-5 border-t border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <p className="text-[10px] text-[var(--color-acero-oscuro)] tracking-wider">
          © {new Date().getFullYear()} Reunata. Todos los derechos reservados.
        </p>
        <div className="flex gap-6">
          <Link href="/privacidad" className="text-[10px] tracking-wider text-[var(--color-acero-oscuro)] hover:text-[var(--foreground)] transition-colors">
            Privacidad
          </Link>
          <Link href="/terminos" className="text-[10px] tracking-wider text-[var(--color-acero-oscuro)] hover:text-[var(--foreground)] transition-colors">
            Términos
          </Link>
        </div>
      </div>
    </footer>
  )
}
