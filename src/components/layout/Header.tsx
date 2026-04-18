'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { ShoppingBag, User, Menu, X, ChevronDown } from 'lucide-react'

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

const nav = [
  { label: 'Nosotros', href: '/nosotros' },
  { label: 'Trabaja con nosotros', href: '/trabaja-con-nosotros' },
  { label: 'Contacto', href: '/contacto' },
]

export function Header() {
  const [open, setOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { scrollY } = useScroll()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsub = scrollY.on('change', (y) => setScrolled(y > 60))
    return unsub
  }, [scrollY])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const bg = useTransform(
    scrollY,
    [0, 60],
    ['rgba(240,241,243,0)', 'rgba(240,241,243,0.95)']
  )
  const borderOpacity = useTransform(scrollY, [0, 60], [0, 1])

  const textClass = scrolled
    ? 'text-[var(--color-granito)] hover:text-[var(--foreground)]'
    : 'text-white/80 hover:text-white'

  const iconColor = scrolled ? 'text-[var(--foreground)]' : 'text-white'
  const logoFilter = scrolled ? '' : 'brightness-0 invert'

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
              onClick={() => setDropdownOpen(!dropdownOpen)}
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
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-64 rounded-xl overflow-hidden"
                  style={{
                    background: 'var(--color-acero-brillo)',
                    border: '1px solid var(--color-acero-claro)',
                    boxShadow: '0 8px 24px rgba(13,15,17,0.1)',
                  }}
                >
                  {categorias.map((cat) => (
                    <Link
                      key={cat.href}
                      href={cat.href}
                      onClick={() => setDropdownOpen(false)}
                      className="block px-5 py-3 text-xs tracking-wide transition-colors duration-150 hover:bg-[var(--color-acero-claro)]"
                      style={{ color: 'var(--color-granito)' }}
                    >
                      {cat.label}
                    </Link>
                  ))}
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
          <Link href="/login" aria-label="Mi cuenta">
            <User
              size={20}
              strokeWidth={1.5}
              className={`transition-colors duration-300 ${iconColor}`}
            />
          </Link>
          <Link href="/carrito" aria-label="Carrito">
            <ShoppingBag
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
        {/* Categorías en mobile */}
        <div className="flex flex-col gap-1">
          <span className="text-xs tracking-widest uppercase text-[var(--color-acero-oscuro)] mb-2">
            Tienda
          </span>
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
