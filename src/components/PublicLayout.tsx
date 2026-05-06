'use client'

import { FloatingActions } from '@/components/sections/FloatingActions'

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FloatingActions />
    </>
  )
}