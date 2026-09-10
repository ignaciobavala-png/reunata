import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  ContainersClient,
  type ViajeAdmin,
  type ReservaAdmin,
  type ClientePermiso,
  type ProductoCatalogo,
} from './ContainersClient'
import type { EtapaContainer } from '@/lib/containers'
import { FILTRO_ROL_CLIENTE } from '@/lib/roles'

export const dynamic = 'force-dynamic'

export default async function ContainersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: perfil } = user
    ? await supabase.from('profiles').select('rol').eq('id', user.id).single()
    : { data: null }

  if (perfil?.rol !== 'master' && perfil?.rol !== 'empleado') {
    return (
      <div className="p-8">
        <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
          No tenés acceso a esta sección.
        </p>
      </div>
    )
  }

  const service = createServiceClient()

  const [{ data: viajes }, { data: items }, { data: reservas }, { data: clientes }, { data: canales }] =
    await Promise.all([
      service.from('containers').select('*').order('orden').order('created_at', { ascending: false }),
      service.from('container_items').select('*').order('codigo_interno').order('variante'),
      service
        .from('container_reservas')
        .select(`
          id, numero, container_id, cliente_id, etapa_compra, descuento_pct, total, moneda, estado,
          facturada_en, entregada_en, movida_a_gesu_en, created_at,
          profiles ( nombre, email, rol )
        `)
        .order('created_at', { ascending: false })
        .limit(200),
      service
        .from('profiles')
        .select('id, nombre, email, rol, containers_habilitado, aprobado')
        .not('rol', 'in', FILTRO_ROL_CLIENTE)
        .eq('activo', true)
        .order('nombre'),
      service.from('canales').select('slug, nombre, acceso_precompra'),
    ])

  // El catálogo entero para el selector. Son ~171 artículos: entra completo y el
  // filtrado se hace en el navegador, sin ida y vuelta por cada tecla.
  const { data: catalogo } = await service
    .from('productos')
    .select('id, codigo_interno, titulo, variantes')
    .eq('activo', true)
    .not('codigo_interno', 'is', null)
    .order('titulo')

  // Qué se vendió de cada color y a quién. Es la lista que Elena necesita para
  // mover la mercadería a la cuenta principal, y en etapa China es la orden de
  // compra al proveedor.
  const { data: lineas } = await service
    .from('container_reserva_items')
    .select(`
      cantidad,
      container_items ( id, container_id, codigo_interno, titulo, variante ),
      container_reservas!inner ( estado, profiles ( nombre, email ) )
    `)
    .neq('container_reservas.estado', 'cancelada')

  const itemsPorViaje = new Map<string, ViajeAdmin['items']>()
  for (const it of items ?? []) {
    const lista = itemsPorViaje.get(it.container_id as string) ?? []
    lista.push({
      id: it.id as number,
      codigo_interno: it.codigo_interno as string,
      titulo: it.titulo as string,
      variante: (it.variante ?? null) as string | null,
      cantidad: it.cantidad as number,
      comprometido: it.comprometido as number,
    })
    itemsPorViaje.set(it.container_id as string, lista)
  }

  type LineaFila = {
    cantidad: number
    container_items: { id: number; container_id: string; codigo_interno: string; titulo: string; variante: string | null } | null
    container_reservas: { estado: string; profiles: { nombre: string | null; email: string | null } | null } | null
  }

  const demandaPorViaje = new Map<string, Map<string, ViajeAdmin['demanda'][number]>>()
  for (const l of (lineas ?? []) as unknown as LineaFila[]) {
    const ci = l.container_items
    if (!ci) continue
    const porViaje = demandaPorViaje.get(ci.container_id) ?? new Map()
    const clave = `${ci.codigo_interno}::${ci.variante ?? ''}`
    const actual = porViaje.get(clave) ?? {
      codigo: ci.codigo_interno,
      titulo: ci.titulo,
      variante: ci.variante,
      cantidad: 0,
      clientes: [] as string[],
    }
    actual.cantidad += l.cantidad
    const quien = l.container_reservas?.profiles?.nombre || l.container_reservas?.profiles?.email
    if (quien && !actual.clientes.includes(quien)) actual.clientes.push(quien)
    porViaje.set(clave, actual)
    demandaPorViaje.set(ci.container_id, porViaje)
  }

  const viajesAdmin: ViajeAdmin[] = (viajes ?? []).map(v => ({
    id: v.id as string,
    nombre: v.nombre as string,
    gesu_cuenta_id: (v.gesu_cuenta_id ?? null) as string | null,
    gesu_token_env: (v.gesu_token_env ?? null) as string | null,
    etapa: v.etapa as EtapaContainer,
    descuento_china: Number(v.descuento_china ?? 0),
    descuento_oceano: Number(v.descuento_oceano ?? 0),
    fecha_cierre_china: (v.fecha_cierre_china ?? null) as string | null,
    fecha_embarque: (v.fecha_embarque ?? null) as string | null,
    fecha_arribo_est: (v.fecha_arribo_est ?? null) as string | null,
    fecha_liberacion: (v.fecha_liberacion ?? null) as string | null,
    cotizacion_congelada: v.cotizacion_congelada != null ? Number(v.cotizacion_congelada) : null,
    notas: (v.notas ?? null) as string | null,
    items: itemsPorViaje.get(v.id as string) ?? [],
    demanda: [...(demandaPorViaje.get(v.id as string)?.values() ?? [])]
      .sort((a, b) => a.codigo.localeCompare(b.codigo) || (a.variante ?? '').localeCompare(b.variante ?? '')),
  }))

  // El embed to-one de PostgREST llega como objeto, no como array.
  const reservasAdmin: ReservaAdmin[] = (reservas ?? []).map(r => {
    const perfilCliente = (r as unknown as { profiles: { nombre: string | null; email: string | null; rol: string } | null }).profiles
    return {
      id: r.id as string,
      numero: r.numero as number,
      containerId: r.container_id as string,
      cliente: perfilCliente?.nombre || perfilCliente?.email || '—',
      rol: perfilCliente?.rol ?? '',
      etapaCompra: r.etapa_compra as string,
      descuentoPct: Number(r.descuento_pct ?? 0),
      total: r.total != null ? Number(r.total) : null,
      moneda: (r.moneda ?? null) as string | null,
      estado: r.estado as ReservaAdmin['estado'],
      facturada: r.facturada_en != null,
      entregada: r.entregada_en != null,
      movidaAGesu: r.movida_a_gesu_en != null,
      creada: r.created_at as string,
    }
  })

  const accesoPorCanal = new Map((canales ?? []).map(c => [c.slug as string, !!c.acceso_precompra]))
  const clientesPermiso: ClientePermiso[] = (clientes ?? []).map(c => ({
    id: c.id as string,
    nombre: (c.nombre ?? c.email ?? '—') as string,
    email: (c.email ?? '') as string,
    rol: c.rol as string,
    habilitado: (c.containers_habilitado ?? null) as boolean | null,
    heredaDelCanal: accesoPorCanal.get(c.rol as string) ?? false,
  }))

  const catalogoAdmin: ProductoCatalogo[] = (catalogo ?? []).map(p => ({
    id: p.id as number,
    codigo: p.codigo_interno as string,
    titulo: p.titulo as string,
    variantes: ((p.variantes ?? []) as { nombre: string }[]).map(v => v.nombre),
  }))

  return (
    <ContainersClient
      viajes={viajesAdmin}
      reservas={reservasAdmin}
      clientes={clientesPermiso}
      catalogo={catalogoAdmin}
    />
  )
}
