import { createClient } from '@/lib/supabase/server'
import { ClientesClient } from './ClientesClient'

export default async function ClientesPage() {
  const supabase = await createClient()

  const ROLES_CLIENTE = ['consumidor_final', 'distribuidor', 'local', 'mercha']

  const [{ data: clientes }, { data: canales }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, nombre, email, rol, aprobado, canal_id, cuit_dni, created_at')
      .in('rol', ROLES_CLIENTE)
      .order('created_at', { ascending: false }),
    supabase
      .from('canales')
      .select('id, slug, nombre')
      .eq('activo', true)
      .neq('slug', 'publico')
      .order('id'),
  ])

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Clientes
      </h1>
      <p className="text-base mb-8" style={{ color: 'var(--color-acero-oscuro)' }}>
        Aprobá el acceso, asigná canal de venta y revisá los datos de cada cliente.
      </p>
      <ClientesClient clientes={clientes ?? []} canales={canales ?? []} />
    </div>
  )
}
