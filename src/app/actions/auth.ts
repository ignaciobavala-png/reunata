'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const ROLES_INTERNOS = ['master', 'empleado', 'comisionista']

export async function login(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    redirect('/login?error=credenciales_invalidas')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (ROLES_INTERNOS.includes(profile?.rol)) {
    redirect('/dashboard/admin')
  }

  const next = formData.get('next') as string | null
  if (next?.startsWith('/') && !next.startsWith('//')) {
    redirect(next)
  }

  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
