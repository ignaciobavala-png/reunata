import { createServiceClient } from '@/lib/supabase/server'
import { CanalesListaClient } from './CanalesListaClient'

export default function CanalesPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Canales
      </h1>
      <ListaContent />
    </div>
  )
}

async function ListaContent() {
  const supabase = createServiceClient()

  const [{ data: canales }, { data: configs }] = await Promise.all([
    supabase
      .from('canales')
      .select('id, slug, nombre, activo')
      .order('id'),
    supabase
      .from('canales_config')
      .select('*'),
  ])

  const configMap: Record<number, Record<string, unknown>> = {}
  for (const c of configs ?? []) {
    configMap[c.canal_id] = c
  }

  return (
    <div>
      <p className="text-base mb-6" style={{ color: 'var(--color-acero-oscuro)' }}>
        {canales?.length ?? 0} canales de venta configurados
      </p>
      <CanalesListaClient
        canales={canales ?? []}
        configsIniciales={configMap}
      />
    </div>
  )
}
