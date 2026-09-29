export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resolverCanalTienda, getProductosDelCanal, esMayoristaPorCanal } from '@/lib/tienda'
import { ContainersClient, type ArriboFiltro } from './ContainersClient'
import { PendingApproval } from '@/components/sections/PendingApproval'
import { aplicarTipoCambio } from '@/lib/utils'
import { stockDisponible } from '@/lib/stock'
import { ordenarFotos } from '@/lib/fotos'
import { ETAPAS_VISIBLES, formatMesArribo } from '@/lib/containers'

export const metadata: Metadata = {
  title: 'Importá con Reunata — Reunata',
  description: 'Productos que están en camino, a un precio mejor que el de la web.',
  alternates: { canonical: '/tienda/containers' },
}

/**
 * Categoría propia de containers dentro de la tienda, a pedido de Gastón
 * (22/09/2026) —hasta ahora la única forma de ver la preventa era el
 * ícono/resumen en la card de cada producto. "Las dos opciones las vamos a
 * necesitar": esto no reemplaza el ícono, se suma.
 *
 * Vive en /tienda/containers (ruta estática, coexiste con /tienda/[slug] igual
 * que /tienda/todos) y no en /tienda/[slug] genérico porque no filtra por
 * `productos.categoria` sino por tener algún viaje abierto en `container_items`.
 *
 * Gateada server-side con el mismo `puede_containers()` que ya usa
 * `/cuenta/reservas` — nadie sin el permiso ve ni un producto de acá, aunque
 * entre por la URL directa. Sin banner ni pantalla de condiciones todavía: eso
 * lo dejó explícitamente para después ("hasta que definamos el tema del
 * banner"), así que a quien no tiene acceso lo mandamos de vuelta a la tienda.
 */
export default async function ContainersPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect(`/login?next=${encodeURIComponent('/tienda/containers')}`)

  const { data: habilitado } = await supabase.rpc('puede_containers')
  if (!habilitado) redirect('/tienda')

  const service = createServiceClient()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const { user, canalId, listaPrecio, mostrarPrecios, pendienteAprobacion, tipoCambioUsd } = await resolverCanalTienda()

  // Mismo caso borde que /favoritos y /tienda/todos: un mayorista que completó
  // el formulario pero todavía no fue aprobado no tiene canal ni precios reales
  // resueltos — mostrarle el catálogo de containers con precios de
  // consumidor_final de respaldo sería mostrarle algo que no le corresponde.
  if (pendienteAprobacion) return <PendingApproval nombre={user?.nombre} />

  const { ids: idsCanal, multiplos } = await getProductosDelCanal(canalId)
  const idsCanalSet = new Set(idsCanal)

  // Todo lo que traiga algún viaje abierto ("armando" o "en viaje"). Nacionalizado
  // queda afuera —ver ETAPAS_VISIBLES— porque ya es la tienda de siempre.
  const { data: itemsRows } = await service
    .from('container_items')
    .select('producto_id, containers!inner(id, nombre, etapa, fecha_arribo_est)')
    .in('containers.etapa', ETAPAS_VISIBLES)

  // Por producto, en qué viajes viene. Es lo que alimenta el filtro "Arribo
  // Octubre / Arribo Diciembre" (pedido del tester, 29/09/2026). Un producto con
  // varios colores tiene una fila por color en el mismo viaje: el Set lo colapsa.
  type ViajeRow = { id: string; nombre: string; fecha_arribo_est: string | null }
  const viajesPorProducto = new Map<number, Set<string>>()
  const viajes = new Map<string, ViajeRow>()
  for (const r of itemsRows ?? []) {
    const productoId = r.producto_id as number | null
    // Embed to-one: PostgREST lo manda como objeto, no como array.
    const c = r.containers as unknown as ViajeRow | null
    if (productoId == null || !c) continue
    viajes.set(c.id, c)
    if (!viajesPorProducto.has(productoId)) viajesPorProducto.set(productoId, new Set())
    viajesPorProducto.get(productoId)!.add(c.id)
  }

  const idsValidos = [...viajesPorProducto.keys()].filter(id => idsCanalSet.has(id))

  type ProductoPublico = {
    id: number
    titulo: string
    codigo_interno: string
    foto_url: string | null
    precio: number | null
    moneda?: string | null
    multiplo: number
    supabaseUrl: string
    variantes?: { nombre: string; stock: number }[] | null
    stock?: number | null
    iva?: number | null
    viajes: string[]
  }

  let productos: ProductoPublico[] = []

  if (idsValidos.length > 0) {
    const { data: prods } = await service
      .from('productos')
      .select('id, titulo, codigo_interno, moneda, iva, stock, stock_visible, variantes, precio_lista1, precio_lista2, precio_lista3, precio_lista4, precio_lista5, producto_fotos(url, orden, destacada)')
      .in('id', idsValidos)
      .eq('activo', true)
      .order('titulo')

    productos = (prods ?? []).map(p => {
      const fotos = ordenarFotos((p.producto_fotos ?? []) as { url: string; orden: number; destacada: boolean }[])
      const precioRaw = mostrarPrecios && listaPrecio
        ? ((p as Record<string, unknown>)[listaPrecio] as number | null) ?? null
        : null
      const { precio, moneda } = aplicarTipoCambio(precioRaw, p.moneda ?? null, tipoCambioUsd)
      return {
        id: p.id,
        titulo: p.titulo,
        codigo_interno: p.codigo_interno,
        foto_url: fotos[0]?.url ?? null,
        precio,
        moneda,
        multiplo: multiplos[p.id] ?? 1,
        supabaseUrl,
        iva: (p.iva as number | null) ?? null,
        viajes: [...(viajesPorProducto.get(p.id) ?? [])],
        variantes: (p.variantes as { nombre: string; stock: number }[] | null) ?? null,
        stock: stockDisponible({
          stock: (p.stock as number | null) ?? null,
          stock_visible: (p.stock_visible as number | null) ?? null,
        }),
      }
    })
  }

  // Un filtro por viaje, en orden de llegada. Si dos viajes llegan el mismo mes
  // el mes solo no alcanza para distinguirlos: se suma el nombre del container.
  const idsConProducto = new Set(productos.flatMap(p => p.viajes))
  const viajesOrdenados = [...viajes.values()]
    .filter(v => idsConProducto.has(v.id))
    .sort((a, b) => (a.fecha_arribo_est ?? '9999').localeCompare(b.fecha_arribo_est ?? '9999'))
  const mesDe = (v: ViajeRow) => formatMesArribo(v.fecha_arribo_est)
  const arribos: ArriboFiltro[] = viajesOrdenados.map(v => {
    const mes = mesDe(v)
    const repetido = viajesOrdenados.filter(o => mesDe(o) === mes).length > 1
    const base = mes ? `Arribo ${mes}` : 'Fecha a confirmar'
    return { id: v.id, label: repetido ? `${base} (${v.nombre})` : base }
  })

  return (
    <main style={{ background: 'var(--background)' }}>
      <div className="px-6 md:px-16 max-w-5xl mx-auto py-20 md:py-28">
        <nav className="text-xs tracking-widest uppercase mb-6 flex items-center gap-2" style={{ color: 'var(--color-acero-oscuro)' }}>
          <Link href="/tienda" className="hover:underline">Tienda</Link>
          <span>/</span>
          <span style={{ color: 'var(--foreground)' }}>REUNATA importa</span>
        </nav>

        <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--color-acero-oscuro)' }}>
          Importá con Reunata — Compra Preventa
        </p>
        <h1
          className="text-3xl md:text-5xl mb-2"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}
        >
          REUNATA importa
        </h1>
        <p className="text-sm mb-12" style={{ color: 'var(--color-acero-oscuro)' }}>
          {productos.length > 0
            ? 'Productos que están por llegar en los próximos meses, a un precio mejor que el de la web.'
            : 'Por el momento no hay ningún viaje abierto tomando pedidos.'}
        </p>

        {productos.length > 0 && (
          <ContainersClient
            productos={productos}
            arribos={arribos}
            mostrarPrecios={mostrarPrecios}
            estaLogueado={!!user}
            esMayorista={esMayoristaPorCanal(user)}
          />
        )}
      </div>
    </main>
  )
}
