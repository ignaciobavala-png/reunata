import { createClient } from '@/lib/supabase/server'

export interface HeaderUser {
  nombre: string | null
  rol: string
}

export interface HeaderCategoria {
  label: string
  href: string
}

export async function getHeaderData(): Promise<{
  headerUser: HeaderUser | null
  headerCategorias: HeaderCategoria[]
}> {
  const supabase = await createClient()

  const [{ data: { user } }, { data: categoriasRows }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('categorias_home')
      .select('nombre, href')
      .eq('activo', true)
      .not('href', 'is', null)
      .order('orden'),
  ])

  let headerUser: HeaderUser | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('nombre, rol')
      .eq('id', user.id)
      .single()
    if (profile) headerUser = { nombre: profile.nombre, rol: profile.rol }
  }

  const headerCategorias = (categoriasRows ?? []).map(c => ({
    label: c.nombre as string,
    href: c.href as string,
  }))

  return { headerUser, headerCategorias }
}
