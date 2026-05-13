import { createClient, createServiceClient } from '@/lib/supabase/server'
import { CanalesClient } from './CanalesClient'
import { ProductosListaClient } from './ProductosListaClient'

interface SearchParams { tab?: string }

export default async function ProductosPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { tab } = await searchParams
  const vistaActual = tab === 'canales' ? 'canales' : 'lista'

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Productos
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 mt-6 mb-6 border-b" style={{ borderColor: 'var(--color-acero-claro)' }}>
        {[
          { key: 'lista', label: 'Lista de productos' },
          { key: 'canales', label: 'Canales de venta' },
        ].map(({ key, label }) => (
          <a
            key={key}
            href={key === 'lista' ? '?' : `?tab=${key}`}
            className="px-4 py-2.5 text-base transition-colors duration-150 border-b-2 -mb-px"
            style={{
              borderColor: vistaActual === key ? 'var(--color-granito)' : 'transparent',
              color: vistaActual === key ? 'var(--foreground)' : 'var(--color-acero-oscuro)',
            }}
          >
            {label}
          </a>
        ))}
      </div>

      {vistaActual === 'canales' ? (
        <CanalesContent />
      ) : (
        <ListaContent />
      )}
    </div>
  )
}

async function ListaContent() {
  const supabase = await createClient()

  const { data: productos } = await supabase
    .from('productos')
    .select('id, codigo_interno, titulo, categoria, stock, precio_lista1, precio_lista2, precio_lista3, precio_compra, activo')
    .order('categoria')
    .order('titulo')

  return (
    <div>
      <p className="text-base mb-6" style={{ color: 'var(--color-acero-oscuro)' }}>
        {productos?.length ?? 0} productos sincronizados desde Gesu
      </p>
      <ProductosListaClient productos={productos ?? []} />
    </div>
  )
}

async function CanalesContent() {
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

  const asignacionesSet = new Set(
    (asignaciones ?? []).map(a => `${a.producto_id}-${a.canal_id}`)
  )

  const categorias = [...new Set((productos ?? []).map(p => p.categoria).filter(Boolean))] as string[]

  return (
    <div>
      <p className="text-base mb-6" style={{ color: 'var(--color-acero-oscuro)' }}>
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
