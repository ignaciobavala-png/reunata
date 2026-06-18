import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CuentaNav } from '@/components/cuenta/CuentaNav'
import { DireccionesClient } from './DireccionesClient'

export const metadata: Metadata = { title: 'Mis direcciones', robots: { index: false, follow: false } }

const MAYORISTAS = ['distribuidor', 'local', 'mercha']

export default async function DireccionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/cuenta/direcciones')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!profile || !MAYORISTAS.includes(profile.rol)) redirect('/cuenta')

  const { data: direcciones } = await supabase
    .from('direcciones_entrega')
    .select('id, alias, calle, numero, piso, localidad, provincia, codigo_postal, predeterminada')
    .eq('cliente_id', user.id)
    .eq('activa', true)
    .order('predeterminada', { ascending: false })
    .order('created_at', { ascending: true })

  return (
    <main className="pt-36 pb-24 px-6 md:px-16 max-w-2xl mx-auto">
      <h1 className="text-3xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Mi cuenta
      </h1>
      <p className="text-base mb-6" style={{ color: 'var(--color-acero-oscuro)' }}>
        Guardá tus domicilios de entrega para agilizar tus pedidos.
      </p>

      <CuentaNav esMayorista />

      <DireccionesClient direcciones={direcciones ?? []} />
    </main>
  )
}
