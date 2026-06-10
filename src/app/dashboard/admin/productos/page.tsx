import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'
import { ProductosListaClient } from './ProductosListaClient'

export default async function ProductosPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Productos
      </h1>
      <ListaContent />
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

  const [{ data: productos }, { data: ofertasActivas }, { data: fotosDestacadas }, { data: novedadesData }, { data: todasLasFotos }, { data: canales }, { data: asignaciones }] = await Promise.all([
    supabase
      .from('productos')
      .select('id, codigo_interno, titulo, categoria, descripcion, stock, stock_visible, precio_lista3, precio_lista5, activo, alto, ancho, largo, peso, enviar_solo')
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

  const ofertasSet = new Set(
    (ofertasActivas ?? []).map(o => `${o.canal}-${o.producto_id}`)
  )
  const destacadasSet = new Set(
    (fotosDestacadas ?? []).map(f => f.producto_id)
  )
  const novedadesSet = new Set(
    (novedadesData ?? []).map(p => p.id)
  )
  const asignacionesSet = new Set(
    (asignaciones ?? []).map(a => `${a.producto_id}-${a.canal_id}`)
  )
  const multiplosMap: Record<string, number> = {}
  for (const a of asignaciones ?? []) {
    multiplosMap[`${a.producto_id}-${a.canal_id}`] = a.multiplo ?? 1
  }

  const stockVisiblesMap: Record<number, number | null> = {}
  for (const p of productos ?? []) {
    if (p.stock_visible !== undefined) stockVisiblesMap[p.id] = p.stock_visible
  }

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
        canalesIniciales={canales ?? []}
        asignacionesIniciales={asignacionesSet}
        multiplosIniciales={multiplosMap}
        stockVisiblesIniciales={stockVisiblesMap}
      />
    </div>
  )
}

