'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Search, Menu, X, ChevronDown } from 'lucide-react'

const categorias = [
  { label: 'Materas y Mochilas',          href: '/tienda/materas-y-mochilas' },
  { label: 'Mates',                         href: '/tienda/mates' },
  { label: 'Bombillas y Sorbetes',         href: '/tienda/bombillas-y-sorbetes' },
  { label: 'Accesorios para el mate',      href: '/tienda/accesorios' },
  { label: 'Térmicos de Acero',            href: '/tienda/termicos-de-acero' },
  { label: 'Merchandising y Promocionales',href: '/tienda/merchandising' },
  { label: 'Para la cocina',               href: '/tienda/cocina' },
  { label: 'Gift Card',                    href: '/tienda/gift-card' },
]

const tiendaLinks = [
  { label: 'Novedades',           href: '/tienda/novedades' },
  { label: 'Más vendidos',        href: '/tienda/mas-vendidos' },
  { label: 'Favoritos',           href: '/favoritos' },
  { label: 'Vistos recientemente', href: '/historial' },
]

const nav = [
  { label: 'Mi Cuenta', href: '/login' },
]

export function Header() {
  const pathname = usePathname()
  const isHome = pathname === '/'

  const [open, setOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [corporativosOpen, setCorporativosOpen] = useState(false)
  const [scrolled, setScrolled] = useState(!isHome)
  const { scrollY } = useScroll()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const corporativosRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isHome) return
    const unsub = scrollY.on('change', (y) => setScrolled(y > 60))
    return unsub
  }, [scrollY, isHome])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
      if (corporativosRef.current && !corporativosRef.current.contains(e.target as Node)) {
        setCorporativosOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const bg = useTransform(
    scrollY,
    [0, 60],
    isHome
      ? ['rgba(240,241,243,0)', 'rgba(255,255,255,0.97)']
      : ['rgba(255,255,255,0.97)', 'rgba(255,255,255,0.97)']
  )
  const borderOpacity = useTransform(scrollY, [0, 60], isHome ? [0, 1] : [1, 1])

  const textClass = scrolled
    ? 'text-[var(--color-granito)] hover:text-[var(--foreground)]'
    : 'text-white/80 hover:text-white'

  const iconColor = scrolled ? 'text-[var(--foreground)]' : 'text-white'
  const logoFilter = scrolled ? 'brightness-0' : 'brightness-0 invert'

  return (
    <>
      <motion.header
        style={{ backgroundColor: bg }}
        className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-5 flex items-center justify-between backdrop-blur-sm"
      >
        <motion.div
          style={{ opacity: borderOpacity }}
          className="absolute inset-x-0 bottom-0 h-px bg-[var(--border)]"
        />

        {/* Logo */}
        <Link href="/" className="relative z-10 flex-shrink-0">
          <Image
            src="/logo.png"
            alt="Reunata"
            width={120}
            height={36}
            className={`h-8 w-auto object-contain transition-all duration-300 ${logoFilter}`}
            priority
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">

          {/* Tienda con dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => { setDropdownOpen(!dropdownOpen); setCorporativosOpen(false) }}
              className={`flex items-center gap-1 text-xs tracking-widest uppercase transition-colors duration-300 ${textClass}`}
            >
              Tienda
              <ChevronDown
                size={12}
                strokeWidth={2}
                className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-72 rounded-xl overflow-hidden"
                  style={{
                    background: 'var(--color-acero-brillo)',
                    border: '1px solid var(--color-acero-claro)',
                    boxShadow: '0 8px 24px rgba(13,15,17,0.1)',
                  }}
                >
                  {/* Explorar */}
                  <div className="px-5 pt-4 pb-1 text-[9px] tracking-[0.3em] uppercase" style={{ color: 'var(--color-acero-oscuro)' }}>
                    Explorar
                  </div>
                  {tiendaLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setDropdownOpen(false)}
                      className="block px-5 py-2.5 text-xs tracking-wide transition-colors duration-150 hover:bg-[var(--color-acero-claro)]"
                      style={{ color: 'var(--color-granito)' }}
                    >
                      {link.label}
                    </Link>
                  ))}

                  <div className="mx-5 my-1 h-px" style={{ background: 'var(--color-acero-claro)' }} />

                  {/* Categorías */}
                  <div className="px-5 pt-1 pb-1 text-[9px] tracking-[0.3em] uppercase" style={{ color: 'var(--color-acero-oscuro)' }}>
                    Categorías
                  </div>
                  {categorias.map((cat) => (
                    <Link
                      key={cat.href}
                      href={cat.href}
                      onClick={() => setDropdownOpen(false)}
                      className="block px-5 py-2.5 text-xs tracking-wide transition-colors duration-150 hover:bg-[var(--color-acero-claro)]"
                      style={{ color: 'var(--color-granito)' }}
                    >
                      {cat.label}
                    </Link>
                  ))}

                  <div className="mx-5 my-1 h-px" style={{ background: 'var(--color-acero-claro)' }} />

                  {/* Promociones */}
                  <Link
                    href="/promociones"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-5 py-3 text-xs font-semibold tracking-wide transition-colors duration-150 hover:bg-[var(--color-acero-claro)]"
                    style={{ color: 'var(--color-granito)', background: 'var(--color-acero-claro)' }}
                  >
                    Promociones especiales →
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Corporativos con dropdown */}
          <div ref={corporativosRef} className="relative">
            <button
              onClick={() => { setCorporativosOpen(!corporativosOpen); setDropdownOpen(false) }}
              className={`flex items-center gap-1 text-xs tracking-widest uppercase transition-colors duration-300 ${textClass}`}
            >
              Corporativos
              <ChevronDown
                size={12}
                strokeWidth={2}
                className={`transition-transform duration-200 ${corporativosOpen ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {corporativosOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-64 rounded-xl overflow-hidden"
                  style={{
                    background: 'var(--color-acero-brillo)',
                    border: '1px solid var(--color-acero-claro)',
                    boxShadow: '0 8px 24px rgba(13,15,17,0.1)',
                  }}
                >
                  <Link
                    href="/corporativos"
                    onClick={() => setCorporativosOpen(false)}
                    className="block px-5 py-3 text-xs tracking-wide transition-colors duration-150 hover:bg-[var(--color-acero-claro)]"
                    style={{ color: 'var(--color-granito)' }}
                  >
                    Productos Personalizados
                  </Link>
                  <Link
                    href="/registro?tab=mayorista"
                    onClick={() => setCorporativosOpen(false)}
                    className="block px-5 py-3 text-xs tracking-wide transition-colors duration-150 hover:bg-[var(--color-acero-claro)]"
                    style={{ color: 'var(--color-granito)' }}
                  >
                    Agencia de Merchandising
                  </Link>
                  <Link
                    href="/registro"
                    onClick={() => setCorporativosOpen(false)}
                    className="block px-5 py-3 text-xs tracking-wide transition-colors duration-150 hover:bg-[var(--color-acero-claro)]"
                    style={{ color: 'var(--color-granito)' }}
                  >
                    Quiero ser mayorista
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-xs tracking-widest uppercase transition-colors duration-300 ${textClass}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button aria-label="Buscar" className={`transition-colors duration-300 ${iconColor}`}>
            <Search
              size={20}
              strokeWidth={1.5}
            />
          </button>
          <Link href="/carrito" aria-label="Carrito">
            <ShoppingCart
              size={20}
              strokeWidth={1.5}
              className={`transition-colors duration-300 ${iconColor}`}
            />
          </Link>
          <button
            onClick={() => setOpen(!open)}
            aria-label="Menú"
            className={`md:hidden transition-colors duration-300 ${iconColor}`}
          >
            {open ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
          </button>
        </div>
      </motion.header>

      {/* Mobile menu */}
      <motion.div
        initial={false}
        animate={open ? { opacity: 1, y: 0, pointerEvents: 'auto' } : { opacity: 0, y: -16, pointerEvents: 'none' }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 top-[72px] z-40 bg-[var(--background)] border-b border-[var(--border)] px-6 py-8 flex flex-col gap-6 md:hidden overflow-y-auto max-h-[calc(100vh-72px)]"
      >
        {/* Tienda en mobile */}
        <div className="flex flex-col gap-1">
          <span className="text-xs tracking-widest uppercase text-[var(--color-acero-oscuro)] mb-2">
            Tienda
          </span>
          {tiendaLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-lg text-[var(--color-granito)] py-1"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {link.label}
            </Link>
          ))}
          <div className="h-px bg-[var(--border)] my-2" />
          {categorias.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              onClick={() => setOpen(false)}
              className="text-lg text-[var(--color-granito)] py-1"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {cat.label}
            </Link>
          ))}
          <div className="h-px bg-[var(--border)] my-2" />
          <Link
            href="/promociones"
            onClick={() => setOpen(false)}
            className="text-lg font-semibold text-[var(--color-granito)] py-1"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Promociones especiales →
          </Link>
        </div>

        {/* Corporativos en mobile */}
        <div className="flex flex-col gap-1">
          <span className="text-xs tracking-widest uppercase text-[var(--color-acero-oscuro)] mb-2">
            Corporativos
          </span>
          <Link
            href="/corporativos"
            onClick={() => setOpen(false)}
            className="text-lg text-[var(--color-granito)] py-1"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Productos Personalizados
          </Link>
          <Link
            href="/registro?tab=mayorista"
            onClick={() => setOpen(false)}
            className="text-lg text-[var(--color-granito)] py-1"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Agencia de Merchandising
          </Link>
          <Link
            href="/registro"
            onClick={() => setOpen(false)}
            className="text-lg text-[var(--color-granito)] py-1"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Quiero ser mayorista
          </Link>
        </div>

        <div className="h-px bg-[var(--border)]" />

        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className="text-2xl text-[var(--foreground)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {item.label}
          </Link>
        ))}
      </motion.div>
    </>
  )
}
