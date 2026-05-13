'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { FadeIn } from '@/components/ui/FadeIn'
import { Camera, Share2, Play, Music, ChevronDown } from 'lucide-react'

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
  { label: 'Instagram', href: 'https://www.instagram.com/reunata.ar/', icon: Camera },
  { label: 'Facebook',  href: 'https://www.facebook.com/reunata.ar/',  icon: Share2 },
  { label: 'TikTok',    href: 'https://www.tiktok.com/@reunata.ar',    icon: Music },
  { label: 'YouTube',   href: 'https://www.youtube.com/@reunata.ar',   icon: Play },
]

const linkClass = 'text-sm text-[var(--color-acero)] hover:text-[var(--color-acero-brillo)] transition-colors duration-200'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-[var(--color-granito-claro)] md:border-none">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-3.5 md:py-0 md:mb-4 md:cursor-default"
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
        <div className="px-6 md:px-10 pt-2 md:pt-12 pb-0 md:pb-12 grid grid-cols-1 md:grid-cols-4 md:gap-8">

          {/* Tienda */}
          <Section title="Tienda">
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
              {tienda.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </Section>

          {/* Empresa */}
          <Section title="Empresa">
            <ul className="flex flex-col gap-2">
              {empresaLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </Section>

          {/* Información / Soporte */}
          <Section title="Información y soporte">
            <ul className="flex flex-col gap-2 mb-4">
              {infoLinks.slice(0, 3).map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>{item.label}</Link>
                </li>
              ))}
            </ul>
            <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--color-acero-oscuro)] mb-3 hidden md:block">Soporte</p>
            <ul className="flex flex-col gap-2">
              {infoLinks.slice(3).map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </Section>

          {/* Contacto + Newsletter + Redes */}
          <Section title="Contacto">
            <ul className="flex flex-col gap-2 mb-4">
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

            <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--color-acero-oscuro)] mb-2">Newsletter</p>
            <p className="text-xs text-[var(--color-acero-oscuro)] mb-3 leading-relaxed">
              10% OFF en tu próxima compra
            </p>
            <form className="flex border border-[var(--color-granito-claro)] hover:border-[var(--color-acero-oscuro)] transition-colors duration-300 mb-4">
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

            <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--color-acero-oscuro)] mb-3">Seguinos</p>
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
          </Section>

        </div>
      </FadeIn>

      {/* Logo gigante */}
      <div className="flex justify-center py-10 md:py-20 border-t border-[var(--color-granito-claro)] bg-white mt-4 md:mt-0">
        <Image
          src="/logo.png"
          alt="Reunata"
          width={1200}
          height={400}
          className="w-[clamp(180px,55vw,700px)] h-auto object-contain brightness-0"
          priority={false}
        />
      </div>

      {/* Bottom bar */}
      <div className="px-6 md:px-10 py-4 border-t border-[var(--color-granito-claro)]">
        <p className="text-[10px] text-[var(--color-acero-oscuro)] tracking-wider">
          © {new Date().getFullYear()} Reunata. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  )
}
