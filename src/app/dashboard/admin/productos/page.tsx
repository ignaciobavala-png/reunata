import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'
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
          { key: 'lista',   label: 'Lista de productos' },
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

      {vistaActual === 'canales' ? <CanalesContent /> : <ListaContent />}
    </div>
  )
}

async function ListaContent() {
  const supabase = createServiceClient()
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  const { data: profile } = user
    ? await authClient.from('profiles').select('rol').eq('id', user.id).single()
    : { data: null }
  const isMaster = profile?.rol === 'master'

  const [{ data: productos }, { data: ofertasActivas }, { data: fotosDestacadas }, { data: novedadesData }, { data: todasLasFotos }] = await Promise.all([
    supabase
      .from('productos')
      .select('id, codigo_interno, titulo, categoria, stock, precio_lista1, precio_lista2, precio_lista3, activo')
      .order('categoria')
      .order('titulo'),
    supabase
      .from('ofertas')
      .select('canal, producto_id'),
    supabase
      .from('producto_fotos')
      .select('producto_id')
      .eq('destacada', true),
    supabase
      .from('productos')
      .select('id')
      .eq('es_novedad', true),
    supabase
      .from('producto_fotos')
      .select('id, producto_id, url, orden, destacada')
      .order('orden'),
  ])

  const ofertasSet = new Set(
    (ofertasActivas ?? []).map(o => `${o.canal}-${o.producto_id}`)
  )
  const destacadasSet = new Set(
    (fotosDestacadas ?? []).map(f => f.producto_id)
  )
  const novedadesSet = new Set(
    (novedadesData ?? []).map(p => p.id)
  )

  return (
    <div>
      <p className="text-base mb-6" style={{ color: 'var(--color-acero-oscuro)' }}>
        {productos?.length ?? 0} productos sincronizados desde Gesu
      </p>
      <ProductosListaClient
        productos={productos ?? []}
        ofertasIniciales={ofertasSet}
        destacadasIniciales={destacadasSet}
        novedadesIniciales={novedadesSet}
        fotosIniciales={todasLasFotos ?? []}
        supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
        isMaster={isMaster}
      />
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
      .neq('slug', 'publico')
      .order('id'),
    supabase
      .from('producto_canales')
      .select('producto_id, canal_id, multiplo'),
  ])

  const asignacionesSet = new Set(
    (asignaciones ?? []).map(a => `${a.producto_id}-${a.canal_id}`)
  )

  const multiplosMap: Record<string, number> = {}
  for (const a of asignaciones ?? []) {
    multiplosMap[`${a.producto_id}-${a.canal_id}`] = a.multiplo ?? 1
  }

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
        multiplosIniciales={multiplosMap}
        categorias={categorias}
      />
    </div>
  )
}
