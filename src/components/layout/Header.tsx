'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ShoppingBag, User, Menu, X } from 'lucide-react'

const nav = [
  { label: 'Tienda', href: '/tienda' },
  { label: 'Colecciones', href: '/colecciones' },
  { label: 'Nosotros', href: '/nosotros' },
  { label: 'Contacto', href: '/contacto' },
]

export function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { scrollY } = useScroll()

  useEffect(() => {
    const unsub = scrollY.on('change', (y) => setScrolled(y > 60))
    return unsub
  }, [scrollY])

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
        className="fixed inset-x-0 top-[72px] z-40 bg-[var(--background)] border-b border-[var(--border)] px-6 py-8 flex flex-col gap-6 md:hidden"
      >
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
