import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const ROLES_INTERNOS = ['master', 'empleado', 'comisionista']

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (ROLES_INTERNOS.includes(profile?.rol)) redirect('/dashboard/admin')
  redirect('/dashboard/cliente')
}
