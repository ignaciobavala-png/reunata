'use client'

import { useEffect } from 'react'
import { useCartStore } from '@/stores/cartStore'

export function ClearCart() {
  const clear = useCartStore(s => s.clear)
  useEffect(() => { clear() }, [clear])
  return null
}
