'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { LogoutButton } from '@/components/LogoutButton'
import {
  LayoutDashboard, Package, RefreshCw, ShoppingCart,
  Users, UserCog, Settings, LogOut, Store, Images,
  Sparkles, ClipboardList, Megaphone, Building2, Camera,
  ChevronDown, TrendingUp, FileText, Mail, CreditCard, PhoneCall,
} from 'lucide-react'

type Rol = 'master' | 'empleado' | 'comisionista' | 'consumidor_final' | 'distribuidor' | 'local' | 'mercha'

type NavLink = { label: string; href: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; badge?: number }
type NavGroup = {
  label: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  children: NavLink[]
}
type NavItem = NavLink | NavGroup

const navMaster: NavItem[] = [
  { label: 'Inicio', href: '/dashboard/admin', icon: LayoutDashboard },
  {
    label: 'Catálogo',
    icon: Package,
    children: [
      { label: 'Productos',   href: '/dashboard/admin/productos', icon: Package },
      { label: 'Sincronizar', href: '/dashboard/admin/sync',      icon: RefreshCw },
    ],
  },
  {
    label: 'Ventas',
    icon: TrendingUp,
    children: [
      { label: 'Pedidos',       href: '/dashboard/admin/pedidos',      icon: ShoppingCart },
      { label: 'Clientes',      href: '/dashboard/admin/clientes',     icon: Users },
      { label: 'Financiación',  href: '/dashboard/admin/financiacion', icon: CreditCard },
      { label: 'Corporativos',  href: '/dashboard/admin/corporativos', icon: Building2 },
    ],
  },
  {
    label: 'Contenido',
    icon: Images,
    children: [
      { label: 'Multimedia',  href: '/dashboard/admin/multimedia', icon: Images },
      { label: 'Instagram',   href: '/dashboard/admin/instagram',  icon: Camera },
      { label: 'Catálogos',   href: '/dashboard/admin/catalogos',  icon: FileText },
      { label: 'Páginas',     href: '/dashboard/admin/contenido',  icon: FileText },
    ],
  },
  {
    label: 'Marketing',
    icon: Megaphone,
    children: [
      { label: 'Newsletter',  href: '/dashboard/admin/newsletter',  icon: Mail },
      { label: 'Chatbot',     href: '/dashboard/admin/chatbot',     icon: Sparkles },
      { label: 'Recontacto',  href: '/dashboard/admin/recontacto', icon: PhoneCall },
    ],
  },
  {
    label: 'Equipo',
    icon: Users,
    children: [
      { label: 'Empleados',     href: '/dashboard/admin/empleados',     icon: UserCog },
      { label: 'Postulaciones', href: '/dashboard/admin/postulaciones', icon: ClipboardList },
    ],
  },
  { label: 'Configuración', href: '/dashboard/admin/configuracion', icon: Settings },
]

const navEmpleado: NavItem[] = [
  { label: 'Inicio',    href: '/dashboard/admin',          icon: LayoutDashboard },
  { label: 'Pedidos',   href: '/dashboard/admin/pedidos',  icon: ShoppingCart },
  { label: 'Clientes',  href: '/dashboard/admin/clientes', icon: Users },
  { label: 'Catálogo',  href: '/dashboard/admin/productos',icon: Package },
]

const navComisionista: NavItem[] = [
  { label: 'Inicio',      href: '/dashboard/admin',          icon: LayoutDashboard },
  { label: 'Mis pedidos', href: '/dashboard/admin/pedidos',  icon: ShoppingCart },
  { label: 'Clientes',    href: '/dashboard/admin/clientes', icon: Users },
]

const navCliente: NavItem[] = [
  { label: 'Inicio',      href: '/dashboard/cliente',          icon: LayoutDashboard },
  { label: 'Catálogo',    href: '/catalogo', icon: Store },
  { label: 'Mis pedidos', href: '/dashboard/cliente/pedidos',  icon: ShoppingCart },
  { label: 'Mi cuenta',   href: '/dashboard/cliente/cuenta',   icon: UserCog },
]

function getNav(rol: Rol) {
  if (rol === 'master') return navMaster
  if (rol === 'empleado') return navEmpleado
  if (rol === 'comisionista') return navComisionista
  return navCliente
}

function getActiveGroup(nav: NavItem[], pathname: string): string | null {
  for (const item of nav) {
    if ('children' in item) {
      const group = item as NavGroup
      if (group.children.some(c => pathname === c.href || pathname.startsWith(c.href + '/'))) {
        return group.label
      }
    }
  }
  return null
}

const LABEL_ROL: Record<Rol, string> = {
  master: 'Administrador',
  empleado: 'Empleado',
  comisionista: 'Comisionista',
  consumidor_final: 'Consumidor Final',
  distribuidor: 'Distribuidor',
  local: 'Local',
  mercha: 'Merchandising',
}

export function Sidebar({ rol, nombre, badges = {} }: { rol: Rol; nombre: string; badges?: Record<string, number> }) {
  const pathname = usePathname()
  const nav = getNav(rol)

  const [openGroup, setOpenGroup] = useState<string | null>(
    () => getActiveGroup(nav, pathname)
  )

  function toggleGroup(label: string) {
    setOpenGroup(prev => prev === label ? null : label)
  }

  return (
    <aside
      className="h-screen w-60 flex flex-col flex-shrink-0 sticky top-0"
      style={{ background: 'var(--color-granito-oscuro)' }}
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b flex-shrink-0" style={{ borderColor: 'rgba(168,176,187,0.12)' }}>
        <Link href="/">
          <Image
            src="/logo.png"
            alt="Reunata"
            width={100}
            height={30}
            className="h-7 w-auto object-contain brightness-0 invert"
          />
        </Link>
      </div>

      {/* Nav */}
      <nav
        className="flex-1 px-3 py-4 overflow-y-auto h-0"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(168,176,187,0.3) transparent' }}
      >
        {nav.map(item => {
          if ('children' in item) {
            const group = item as NavGroup
            const isOpen = openGroup === group.label
            const hasActive = group.children.some(
              c => pathname === c.href || pathname.startsWith(c.href + '/')
            )

            return (
              <div key={group.label} className="mb-0.5">
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm tracking-wide transition-colors duration-150"
                  style={{
                    color: hasActive ? 'var(--color-acero-brillo)' : 'var(--color-acero-oscuro)',
                    background: hasActive && !isOpen ? 'rgba(168,176,187,0.08)' : 'transparent',
                  }}
                >
                  <group.icon size={16} strokeWidth={1.5} />
                  <span className="flex-1 text-left">{group.label}</span>
                  <ChevronDown
                    size={13}
                    strokeWidth={2}
                    className="flex-shrink-0 transition-transform duration-200"
                    style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                  />
                </button>

                {isOpen && (
                  <div className="mt-0.5 mb-1">
                    {group.children.map(child => {
                      const active = pathname === child.href || pathname.startsWith(child.href + '/')
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="flex items-center gap-3 pl-9 pr-3 py-2 rounded-lg mb-0.5 text-sm tracking-wide transition-colors duration-150"
                          style={{
                            color: active ? 'var(--color-acero-brillo)' : 'var(--color-acero-oscuro)',
                            background: active ? 'rgba(168,176,187,0.12)' : 'transparent',
                          }}
                        >
                          <child.icon size={14} strokeWidth={1.5} />
                          <span className="flex-1">{child.label}</span>
                          {(badges[child.href] ?? 0) > 0 && (
                            <span
                              className="text-xs font-semibold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none"
                              style={{ background: '#ef4444', color: 'white' }}
                            >
                              {badges[child.href]}
                            </span>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          const link = item as NavLink
          const active = pathname === link.href || pathname.startsWith(link.href + '/')
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm tracking-wide transition-colors duration-150"
              style={{
                color: active ? 'var(--color-acero-brillo)' : 'var(--color-acero-oscuro)',
                background: active ? 'rgba(168,176,187,0.12)' : 'transparent',
              }}
            >
              <link.icon size={16} strokeWidth={1.5} />
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t flex-shrink-0" style={{ borderColor: 'rgba(168,176,187,0.12)' }}>
        <div className="mb-3 px-2">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--color-acero-brillo)' }}>
            {nombre}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
            {LABEL_ROL[rol]}
          </p>
        </div>
        <LogoutButton
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
          style={{ color: 'var(--color-acero-oscuro)' }}
        >
          <LogOut size={14} strokeWidth={1.5} />
          Cerrar sesión
        </LogoutButton>
      </div>
    </aside>
  )
}
