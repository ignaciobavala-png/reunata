'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

export function SupabaseAuthListener() {
  const router = useRouter()
  const supabase = useRef(createClient())

  useEffect(() => {
    const { data: { subscription } } = supabase.current.auth.onAuthStateChange((event) => {
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
  }, [router])

  return null
}
