'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import {
  LayoutDashboard, Package, RefreshCw, ShoppingCart,
  Users, UserCog, Settings, LogOut, Layers, Store, Images, Sparkles, ClipboardList,
} from 'lucide-react'

type Rol = 'master' | 'empleado' | 'comisionista' | 'consumidor_final' | 'distribuidor' | 'local' | 'mercha'

const navMaster = [
  { label: 'Inicio',        href: '/dashboard/admin',                icon: LayoutDashboard },
  { label: 'Productos',     href: '/dashboard/admin/productos',       icon: Package },
  { label: 'Multimedia',    href: '/dashboard/admin/multimedia',      icon: Images },
  { label: 'Canales',       href: '/dashboard/admin/canales',         icon: Layers },
  { label: 'Pedidos',       href: '/dashboard/admin/pedidos',         icon: ShoppingCart },
  { label: 'Clientes',      href: '/dashboard/admin/clientes',        icon: Users },
  { label: 'Equipo',        href: '/dashboard/admin/empleados',       icon: UserCog },
  { label: 'Sincronizar',   href: '/dashboard/admin/sync',            icon: RefreshCw },
  { label: 'Configuración',    href: '/dashboard/admin/configuracion',   icon: Settings },
  { label: 'Chatbot',          href: '/dashboard/admin/chatbot',          icon: Sparkles },
  { label: 'Postulaciones',    href: '/dashboard/admin/postulaciones',    icon: ClipboardList },
]

const navEmpleado = [
  { label: 'Inicio',    href: '/dashboard/admin',          icon: LayoutDashboard },
  { label: 'Pedidos',   href: '/dashboard/admin/pedidos',  icon: ShoppingCart },
  { label: 'Clientes',  href: '/dashboard/admin/clientes', icon: Users },
  { label: 'Catálogo',  href: '/dashboard/admin/productos',icon: Package },
]

const navComisionista = [
  { label: 'Inicio',      href: '/dashboard/admin',          icon: LayoutDashboard },
  { label: 'Mis pedidos', href: '/dashboard/admin/pedidos',  icon: ShoppingCart },
  { label: 'Clientes',    href: '/dashboard/admin/clientes', icon: Users },
]

const navCliente = [
  { label: 'Inicio',      href: '/dashboard/cliente',          icon: LayoutDashboard },
  { label: 'Catálogo',    href: '/dashboard/cliente/catalogo', icon: Store },
  { label: 'Mis pedidos', href: '/dashboard/cliente/pedidos',  icon: ShoppingCart },
  { label: 'Mi cuenta',   href: '/dashboard/cliente/cuenta',   icon: UserCog },
]

function getNav(rol: Rol) {
  if (rol === 'master') return navMaster
  if (rol === 'empleado') return navEmpleado
  if (rol === 'comisionista') return navComisionista
  return navCliente
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

export function Sidebar({ rol, nombre }: { rol: Rol; nombre: string }) {
  const pathname = usePathname()
  const nav = getNav(rol)

  return (
    <aside
      className="h-screen w-60 flex flex-col flex-shrink-0 sticky top-0"
      style={{ background: 'var(--color-granito-oscuro)' }}
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b" style={{ borderColor: 'rgba(168,176,187,0.12)' }}>
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
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {nav.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm tracking-wide transition-colors duration-150"
              style={{
                color: active ? 'var(--color-acero-brillo)' : 'var(--color-acero-oscuro)',
                background: active ? 'rgba(168,176,187,0.12)' : 'transparent',
              }}
            >
              <Icon size={16} strokeWidth={1.5} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t" style={{ borderColor: 'rgba(168,176,187,0.12)' }}>
        <div className="mb-3 px-2">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--color-acero-brillo)' }}>
            {nombre}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
            {LABEL_ROL[rol]}
          </p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
            style={{ color: 'var(--color-acero-oscuro)' }}
          >
            <LogOut size={14} strokeWidth={1.5} />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  )
}
