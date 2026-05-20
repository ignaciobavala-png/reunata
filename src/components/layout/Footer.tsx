'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { FadeIn } from '@/components/ui/FadeIn'
import { ChevronDown } from 'lucide-react'

const empresaLinks = [
  { label: 'Nosotros',                href: '/nosotros' },
  { label: 'Próximos eventos',        href: '/eventos' },
  { label: 'Trabajá con nosotros',    href: '/trabaja-con-nosotros' },
  { label: 'Quiero ser distribuidor', href: '/login' },
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
  { label: 'Instagram', href: 'https://www.instagram.com/reunata.ar/', imageSrc: '/icons/social/instagram.png' },
  { label: 'Facebook',  href: 'https://www.facebook.com/reunata.ar/',  imageSrc: '/icons/social/facebook.png' },
  { label: 'YouTube',   href: 'https://www.youtube.com/@reunata.ar',   imageSrc: '/icons/social/youtube.png' },
]

const linkClass = 'text-sm text-[var(--color-acero)] hover:text-[var(--color-acero-brillo)] transition-colors duration-200'

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-[var(--color-granito-claro)] md:border-none">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-3.5 md:cursor-default md:mb-4 md:py-0"
      >
        <span className="text-[10px] tracking-[0.3em] uppercase text-[var(--color-acero-oscuro)]">
          {title}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={1.5}
          className={`md:hidden transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          style={{ color: 'var(--color-acero-oscuro)' }}
        />
      </button>
      <div className={`pb-4 md:pb-0 ${open ? 'block' : 'hidden'} md:block`}>
        {children}
      </div>
    </div>
  )
}

export function Footer() {
  return (
    <footer className="bg-[var(--color-granito-oscuro)] border-t border-[var(--color-granito-claro)] overflow-hidden">
      <FadeIn delay={0.1}>
        <div className="px-8 md:px-16 lg:px-24 pt-2 md:pt-12 pb-0 md:pb-12 grid grid-cols-1 md:grid-cols-4 md:gap-10">

          {/* Empresa */}
          <Accordion title="Empresa">
            <ul className="flex flex-col gap-2">
              {empresaLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </Accordion>

          {/* Información */}
          <Accordion title="Información">
            <ul className="flex flex-col gap-2">
              {infoLinks.slice(0, 4).map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </Accordion>

          {/* Soporte */}
          <Accordion title="Soporte">
            <ul className="flex flex-col gap-2">
              {infoLinks.slice(4).map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>{item.label}</Link>
                </li>
              ))}
              <li>
                <a href="https://wa.me/5491132720974" target="_blank" rel="noopener noreferrer" className={linkClass}>
                  WhatsApp
                </a>
              </li>
              <li>
                <Link href="/contacto#opiniones" className={linkClass}>
                  Tu opinión nos importa
                </Link>
              </li>
            </ul>
          </Accordion>

          {/* Newsletter + Redes */}
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--color-acero-oscuro)] py-3.5 md:py-0 md:mb-4">
              Newsletter
            </p>
            <p className="text-xs text-[var(--color-acero-oscuro)] mb-3">10% OFF en tu próxima compra</p>
            <form className="flex border border-[var(--color-granito-claro)] hover:border-[var(--color-acero-oscuro)] transition-colors duration-300 mb-6">
              <input
                type="email"
                placeholder="tu@email.com"
                className="flex-1 px-3 py-2.5 bg-transparent text-xs outline-none text-[var(--color-acero-brillo)] placeholder:text-[var(--color-granito-claro)] min-w-0"
              />
              <button
                type="submit"
                className="px-3 py-2.5 text-[10px] tracking-widest uppercase bg-[var(--color-acero-oscuro)] text-[var(--color-granito-oscuro)] hover:bg-[var(--color-acero)] transition-colors duration-200 whitespace-nowrap"
              >
                OK
              </button>
            </form>

            <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--color-acero-oscuro)] mb-3">Seguinos</p>
            <div className="flex gap-3 pb-4 md:pb-0">
              {redes.map((r) => (
                <a
                  key={r.label}
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={r.label}
                  className="w-12 h-12 flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity duration-200"
                >
                  <Image
                    src={r.imageSrc}
                    alt={r.label}
                    width={48}
                    height={48}
                    className="w-12 h-12 object-contain invert"
                  />
                </a>
              ))}
            </div>
          </div>

        </div>
      </FadeIn>

      {/* Logo */}
      <div className="flex justify-center py-10 md:py-20 border-t border-[var(--color-granito-claro)] bg-white mt-4 md:mt-0">
        <Image
          src="/Logo-Reunata.png"
          alt="Reunata"
          width={7883}
          height={1719}
          className="w-[clamp(200px,60vw,800px)] h-auto object-contain brightness-0"
          priority={false}
        />
      </div>

      {/* Bottom bar */}
      <div className="px-8 md:px-16 lg:px-24 py-4 border-t border-[var(--color-granito-claro)]">
        <p className="text-[10px] text-[var(--color-acero-oscuro)] tracking-wider">
          © {new Date().getFullYear()} Reunata. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  )
}
