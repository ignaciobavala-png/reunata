'use client'

import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/stores/cartStore'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

export function SupabaseAuthListener() {
  const router = useRouter()
  const supabase = useRef(createClient())
  const clearIfOwnerChanged = useCartStore(s => s.clearIfOwnerChanged)
  const clear = useCartStore(s => s.clear)

  useEffect(() => {
    const { data: { subscription } } = supabase.current.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        clearIfOwnerChanged(session?.user.id ?? null)
      } else if (event === 'SIGNED_OUT') {
        clear()
      }

      if (
        event === 'SIGNED_IN' ||
        event === 'SIGNED_OUT' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'INITIAL_SESSION'
      ) {
        router.refresh()
      }
    })
    return () => subscription.unsubscribe()
  }, [router, clearIfOwnerChanged, clear])

  return null
}
