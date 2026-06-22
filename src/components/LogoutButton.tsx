'use client'

import { useCartStore } from '@/stores/cartStore'
import { logout } from '@/app/actions/auth'

interface Props {
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}

export function LogoutButton({ className, style, children }: Props) {
  const clear = useCartStore(s => s.clear)

  async function handleLogout() {
    clear()
    await logout()
  }

  return (
    <button type="button" onClick={handleLogout} className={className} style={style}>
      {children}
    </button>
  )
}
