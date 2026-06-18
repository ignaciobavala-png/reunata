import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RecontactoClient } from './RecontactoClient'

export default async function RecontactoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!profile || !['master', 'empleado'].includes(profile.rol)) redirect('/dashboard')

  const { data: clientes } = await supabase
    .from('profiles')
    .select(`
      id, nombre, email, razon_social, telefono, rol, ultima_compra_en, created_at,
      canales ( id, slug, nombre ),
      canales_config ( marketing_mensaje_recontacto, marketing_link_agendamiento )
    `)
    .eq('requiere_recontacto', true)
    .in('rol', ['distribuidor', 'local', 'mercha'])
    .order('ultima_compra_en', { ascending: true, nullsFirst: true })

  const datos = (clientes ?? []).map(c => ({
    ...c,
    canales: Array.isArray(c.canales) ? (c.canales[0] ?? null) : c.canales,
    canales_config: Array.isArray(c.canales_config) ? (c.canales_config[0] ?? null) : c.canales_config,
  }))

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Clientes para recontactar
      </h1>
      <p className="text-base mb-8" style={{ color: 'var(--color-acero-oscuro)' }}>
        Mayoristas sin actividad de compra en el período configurado por canal.
      </p>
      <RecontactoClient clientes={datos as Parameters<typeof RecontactoClient>[0]['clientes']} />
    </div>
  )
}
