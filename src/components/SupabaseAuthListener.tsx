'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function SupabaseAuthListener() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      router.refresh()
    })
    return () => subscription.unsubscribe()
  }, [router, supabase])

  return null
}
