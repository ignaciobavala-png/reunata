import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/Sidebar'

const ROLES_CON_DASHBOARD = ['master', 'empleado', 'comisionista']

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre, email')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  if (!ROLES_CON_DASHBOARD.includes(profile.rol)) redirect('/')

  return (
    <div data-dashboard className="flex h-screen overflow-hidden font-medium" style={{ background: 'var(--background)' }}>
      <Sidebar rol={profile.rol} nombre={profile.nombre || profile.email} />
      <main className="flex-1 overflow-auto" data-lenis-prevent>
        {children}
      </main>
    </div>
  )
}
