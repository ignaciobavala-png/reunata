import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PublicCartDrawer } from '@/components/cliente/PublicCartDrawer'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let headerUser: { nombre: string | null; rol: string } | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('nombre, rol')
      .eq('id', user.id)
      .single()
    if (profile) headerUser = { nombre: profile.nombre, rol: profile.rol }
  }

  const { data: categoriasRows } = await supabase
    .from('categorias_home')
    .select('nombre, href')
    .eq('activo', true)
    .not('href', 'is', null)
    .order('orden')
  const headerCategorias = (categoriasRows ?? []).map(c => ({ label: c.nombre as string, href: c.href as string }))

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--background)' }}>
      <Header user={headerUser} categorias={headerCategorias} />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
      <PublicCartDrawer user={headerUser} />
    </div>
  )
}
