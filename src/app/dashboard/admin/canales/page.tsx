import { createServiceClient } from '@/lib/supabase/server'
import { CanalesClient } from './CanalesClient'

export default async function CanalesPage() {
  const supabase = createServiceClient()

  const [{ data: productos }, { data: canales }, { data: asignaciones }] = await Promise.all([
    supabase
      .from('productos')
      .select('id, codigo_interno, titulo, categoria')
      .eq('activo', true)
      .order('categoria')
      .order('titulo'),
    supabase
      .from('canales')
      .select('id, slug, nombre')
      .eq('activo', true)
      .order('id'),
    supabase
      .from('producto_canales')
      .select('producto_id, canal_id'),
  ])

  // Construir set de asignaciones: "productoId-canalId"
  const asignacionesSet = new Set(
    (asignaciones ?? []).map(a => `${a.producto_id}-${a.canal_id}`)
  )

  const categorias = [...new Set((productos ?? []).map(p => p.categoria).filter(Boolean))] as string[]

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Asignación a canales
      </h1>
      <p className="text-base mb-8" style={{ color: 'var(--color-acero-oscuro)' }}>
        Elegí qué productos de Gesu son visibles para cada tipo de cliente.
      </p>

      <CanalesClient
        productos={productos ?? []}
        canales={canales ?? []}
        asignacionesIniciales={asignacionesSet}
        categorias={categorias}
      />
    </div>
  )
}
