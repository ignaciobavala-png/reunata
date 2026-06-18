'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS_MAYORISTA = [
  { href: '/cuenta',             label: 'Mi cuenta' },
  { href: '/cuenta/direcciones', label: 'Direcciones' },
  { href: '/cuenta/financiacion', label: 'Financiación' },
]

const LINKS_MINORISTA = [
  { href: '/cuenta', label: 'Mi cuenta' },
]

export function CuentaNav({ esMayorista }: { esMayorista: boolean }) {
  const pathname = usePathname()
  const links = esMayorista ? LINKS_MAYORISTA : LINKS_MINORISTA
  if (links.length === 1) return null

  return (
    <nav className="flex gap-1 mb-8 border-b" style={{ borderColor: 'var(--color-acero-claro)' }}>
      {links.map(l => {
        const active = pathname === l.href
        return (
          <Link
            key={l.href}
            href={l.href}
            className="px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              color:       active ? 'var(--foreground)'        : 'var(--color-acero-oscuro)',
              borderBottom: active ? '2px solid var(--foreground)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}
