'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Search, Menu, X, ChevronDown, ShoppingBag, Trash2, User } from 'lucide-react'
import { useCartStore } from '@/stores/cartStore'
import { logout } from '@/app/actions/auth'

const ROLES_INTERNOS = ['master', 'empleado', 'comisionista']

interface HeaderUser {
  nombre: string | null
  rol: string
}

interface HeaderCategoria {
  label: string
  href: string
}

const tiendaLinks = [
  { label: 'Novedades',           href: '/tienda/novedades' },
  { label: 'Más vendidos',        href: '/tienda/mas-vendidos' },
  { label: 'Favoritos',           href: '/favoritos' },
  { label: 'Vistos recientemente', href: '/historial' },
]

export function Header({ user, categorias = [] }: { user?: HeaderUser | null; categorias?: HeaderCategoria[] }) {
  const pathname = usePathname()
  const isHome = pathname === '/'

  const [open, setOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [corporativosOpen, setCorporativosOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [scrolled, setScrolled] = useState(!isHome)

  const { items, remove, updateCantidad, totalItems, cartOpen, setCartOpen } = useCartStore()
  const [mounted, setMounted] = useState(false)
  const { scrollY } = useScroll()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const corporativosRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

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
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false)
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link
            href="/registro?tab=mayorista"
            className={`text-xs tracking-widest uppercase transition-colors duration-300 ${textClass}`}
          >
            Mayoristas
          </Link>

        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button aria-label="Buscar" className={`transition-colors duration-300 ${iconColor}`}>
            <Search size={20} strokeWidth={1.5} />
          </button>

          {/* Usuario / login */}
          <div ref={userRef} className="relative">
            {user ? (
              <button
                onClick={() => setUserOpen(!userOpen)}
                aria-label="Mi cuenta"
                className={`transition-colors duration-300 ${iconColor}`}
              >
                <User size={20} strokeWidth={1.5} />
              </button>
            ) : (
              <Link href="/login" aria-label="Iniciar sesión" className={`transition-colors duration-300 ${iconColor}`}>
                <User size={20} strokeWidth={1.5} />
              </Link>
            )}

            <AnimatePresence>
              {userOpen && user && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute top-full right-0 mt-4 w-52 rounded-xl overflow-hidden"
                  style={{
                    background: 'var(--color-acero-brillo)',
                    border: '1px solid var(--color-acero-claro)',
                    boxShadow: '0 8px 24px rgba(13,15,17,0.1)',
                  }}
                >
                  {user.nombre && (
                    <>
                      <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--color-acero-claro)' }}>
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>{user.nombre}</p>
                      </div>
                    </>
                  )}
                  {ROLES_INTERNOS.includes(user.rol) ? (
                    <Link
                      href="/dashboard/admin"
                      onClick={() => setUserOpen(false)}
                      className="block px-5 py-3 text-xs tracking-wide transition-colors duration-150 hover:bg-[var(--color-acero-claro)]"
                      style={{ color: 'var(--color-granito)' }}
                    >
                      Panel de administración
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/cuenta"
                        onClick={() => setUserOpen(false)}
                        className="block px-5 py-3 text-xs tracking-wide transition-colors duration-150 hover:bg-[var(--color-acero-claro)]"
                        style={{ color: 'var(--color-granito)' }}
                      >
                        Mi cuenta
                      </Link>
                      <Link
                        href="/pedidos"
                        onClick={() => setUserOpen(false)}
                        className="block px-5 py-3 text-xs tracking-wide transition-colors duration-150 hover:bg-[var(--color-acero-claro)]"
                        style={{ color: 'var(--color-granito)' }}
                      >
                        Mis pedidos
                      </Link>
                    </>
                  )}
                  <div className="mx-5 h-px" style={{ background: 'var(--color-acero-claro)' }} />
                  <form action={logout}>
                    <button
                      type="submit"
                      className="block w-full text-left px-5 py-3 text-xs tracking-wide transition-colors duration-150 hover:bg-[var(--color-acero-claro)]"
                      style={{ color: 'var(--color-acero-oscuro)' }}
                    >
                      Cerrar sesión
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setCartOpen(true)}
            aria-label="Carrito"
            className="relative"
          >
            <ShoppingCart
              size={20}
              strokeWidth={1.5}
              className={`transition-colors duration-300 ${iconColor}`}
            />
            {mounted && totalItems() > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[10px] font-medium flex items-center justify-center bg-[var(--color-granito-oscuro)] text-[var(--color-acero-brillo)]">
                {totalItems()}
              </span>
            )}
          </button>
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
        </div>

        <div className="h-px bg-[var(--border)]" />

        {/* Mayoristas en mobile */}
        <Link
          href="/registro?tab=mayorista"
          onClick={() => setOpen(false)}
          className="text-lg text-[var(--color-granito)] py-1"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Quiero ser mayorista
        </Link>

        <div className="h-px bg-[var(--border)]" />

        {/* Usuario mobile */}
        {user ? (
          <div className="flex flex-col gap-1">
            <span className="text-xs tracking-widest uppercase text-[var(--color-acero-oscuro)] mb-2">
              {user.nombre ?? 'Mi cuenta'}
            </span>
            {ROLES_INTERNOS.includes(user.rol) ? (
              <Link
                href="/dashboard/admin"
                onClick={() => setOpen(false)}
                className="text-lg text-[var(--color-granito)] py-1"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Panel de administración
              </Link>
            ) : (
              <>
                <Link
                  href="/cuenta"
                  onClick={() => setOpen(false)}
                  className="text-lg text-[var(--color-granito)] py-1"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Mi cuenta
                </Link>
                <Link
                  href="/pedidos"
                  onClick={() => setOpen(false)}
                  className="text-lg text-[var(--color-granito)] py-1"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Mis pedidos
                </Link>
              </>
            )}
            <form action={logout}>
              <button
                type="submit"
                className="text-lg text-[var(--color-acero-oscuro)] py-1 text-left"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="text-2xl text-[var(--foreground)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Iniciar sesión
          </Link>
        )}
      </motion.div>

      {/* Cart drawer */}
      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.div
              key="cart-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setCartOpen(false)}
            />
            <motion.div
              key="cart-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-0 right-0 h-full z-50 flex flex-col w-[360px] max-w-full bg-white"
              style={{ boxShadow: '-4px 0 24px rgba(0,0,0,0.08)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-acero-claro)' }}>
                <div className="flex items-center gap-2">
                  <ShoppingBag size={16} style={{ color: 'var(--color-granito)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                    Mi carrito
                  </span>
                </div>
                <button onClick={() => setCartOpen(false)}>
                  <X size={16} style={{ color: 'var(--color-acero-oscuro)' }} />
                </button>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-2">
                    <ShoppingBag size={28} strokeWidth={1.2} style={{ color: 'var(--color-acero-claro)' }} />
                    <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                      Tu carrito está vacío
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {items.map(item => (
                      <div
                        key={item.productoId}
                        className="flex gap-3 p-3 rounded-xl"
                        style={{ background: 'var(--color-acero-claro)' }}
                      >
                        {/* Foto */}
                        <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden" style={{ background: 'var(--color-acero)' }}>
                          {item.foto_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.foto_url}
                              alt={item.titulo}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag size={18} style={{ color: 'var(--color-acero-oscuro)' }} />
                            </div>
                          )}
                        </div>

                        {/* Info + controles */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <p className="text-[10px] font-mono" style={{ color: 'var(--color-acero-oscuro)' }}>
                              {item.codigo_interno}
                            </p>
                            <p className="text-xs font-medium leading-snug mt-0.5 line-clamp-2" style={{ color: 'var(--foreground)' }}>
                              {item.titulo}
                            </p>
                          </div>

                          {/* Cantidad + tachito */}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center rounded-lg overflow-hidden" style={{ background: 'white', border: '1px solid var(--border)' }}>
                              <button
                                onClick={() => updateCantidad(item.productoId, Math.max(1, item.cantidad - 1))}
                                disabled={item.cantidad <= 1}
                                className="w-8 h-8 flex items-center justify-center text-base font-light transition-colors hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                                style={{ color: 'var(--color-granito)' }}
                                aria-label="Reducir cantidad"
                              >
                                −
                              </button>
                              <span className="w-8 text-center text-sm font-semibold tabular-nums" style={{ color: 'var(--foreground)' }}>
                                {item.cantidad}
                              </span>
                              <button
                                onClick={() => updateCantidad(item.productoId, item.cantidad + 1)}
                                className="w-8 h-8 flex items-center justify-center text-base font-light transition-colors hover:bg-gray-50"
                                style={{ color: 'var(--color-granito)' }}
                                aria-label="Aumentar cantidad"
                              >
                                +
                              </button>
                            </div>
                            <button
                              onClick={() => remove(item.productoId)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-red-50"
                              style={{ color: 'var(--color-acero-oscuro)' }}
                              aria-label="Eliminar"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--color-acero-claro)' }}>
                {items.length > 0 ? (
                  user ? (
                    <Link
                      href="/tienda"
                      onClick={() => setCartOpen(false)}
                      className="block w-full py-3 rounded-lg text-sm font-medium text-center transition-opacity"
                      style={{ background: 'var(--color-granito-oscuro)', color: 'var(--color-acero-brillo)' }}
                    >
                      Continuar comprando →
                    </Link>
                  ) : (
                    <>
                      <p className="text-xs mb-4 text-center" style={{ color: 'var(--color-acero-oscuro)' }}>
                        Iniciá sesión para ver precios y hacer tu pedido.
                      </p>
                      <Link
                        href="/login?next=/tienda"
                        onClick={() => setCartOpen(false)}
                        className="block w-full py-3 rounded-lg text-sm font-medium text-center transition-opacity"
                        style={{ background: 'var(--color-granito-oscuro)', color: 'var(--color-acero-brillo)' }}
                      >
                        Iniciar sesión →
                      </Link>
                      <Link
                        href="/registro"
                        onClick={() => setCartOpen(false)}
                        className="block w-full py-2.5 mt-2 rounded-lg text-xs text-center border transition-opacity"
                        style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}
                      >
                        ¿No tenés cuenta? Registrate
                      </Link>
                    </>
                  )
                ) : (
                  <p className="text-xs text-center" style={{ color: 'var(--color-acero-oscuro)' }}>
                    Agregá productos para continuar.
                  </p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
