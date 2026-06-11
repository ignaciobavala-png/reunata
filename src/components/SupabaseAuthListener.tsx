'use client'

import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/stores/cartStore'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

export function SupabaseAuthListener() {
  const router = useRouter()
  const supabase = useRef(createClient())
  const clearIfOwnerChanged = useCartStore(s => s.clearIfOwnerChanged)
  const setOwner = useCartStore(s => s.setOwner)

  useEffect(() => {
    const { data: { subscription } } = supabase.current.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        clearIfOwnerChanged(session?.user.id ?? null)
      } else if (event === 'SIGNED_OUT') {
        // No limpiar ítems: SIGNED_OUT también se dispara por expiración de token.
        // El logout explícito llama clear() directamente desde el botón de logout.
        setOwner(null)
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
  }, [router, clearIfOwnerChanged, setOwner])

  return null
}
