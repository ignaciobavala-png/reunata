import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resolverCanalTienda, getProductosDelCanal } from '@/lib/tienda'
import { aplicarTipoCambio } from '@/lib/utils'
import { netoDesdeBruto } from '@/lib/iva'
import {
  ETAPAS_VISIBLES,
  aceptaReservas,
  descuentoVigente,
  precioConDescuento,
  type DisponibilidadPorCodigo,
  type EtapaContainer,
  type ViajeDisponible,
} from '@/lib/containers'

/**
 * Qué viajes traen los productos que hay en pantalla.
 *
 * La grilla pregunta por los códigos que está mostrando y el permiso se chequea
 * ACÁ, no en el caller: así ninguna página tiene que acordarse de pasar un flag
 * de "puede ver containers" y no hay forma de que una grilla nueva se olvide y
 * filtre precios de preventa a quien no corresponde.
 *
 * Vacío ({}) es la respuesta correcta para el que no tiene permiso: la card
 * simplemente no muestra el badge.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const codigos: string[] = Array.isArray(body?.codigos)
    ? [...new Set<string>(body.codigos.filter((c: unknown): c is string => typeof c === 'string' && c.length > 0))]
    : []

  const vacio = NextResponse.json({ habilitado: false, porCodigo: {} })
  if (codigos.length === 0) return vacio

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return vacio

  const { data: habilitado } = await supabase.rpc('puede_containers')
  if (!habilitado) return vacio

  const { canalId, listaPrecio, mostrarPrecios, tipoCambioUsd } = await resolverCanalTienda()
  if (!mostrarPrecios || !listaPrecio) return vacio

  // La preventa respeta las mismas reglas de canal que la tienda: qué productos ve
  // el cliente y de a cuánto los compra. Sin esto, alguien podía reservar un
  // producto que su canal no tiene habilitado, y en cantidades que rompen el bulto
  // mínimo — y esa reserva después había que facturarla igual.
  const { ids: idsCanal, multiplos } = await getProductosDelCanal(canalId)
  const permitidos = new Set(idsCanal)

  const service = createServiceClient()

  const [{ data: items }, { data: productos }] = await Promise.all([
    service
      .from('container_items')
      .select(`
        id, producto_id, codigo_interno, variante, cantidad, comprometido, precio_base,
        containers!inner (
          id, nombre, etapa, descuento_china, descuento_oceano, fecha_arribo_est, orden
        )
      `)
      .in('codigo_interno', codigos)
      .in('containers.etapa', ETAPAS_VISIBLES),
    service
      .from('productos')
      .select(`codigo_interno, moneda, iva, ${listaPrecio}`)
      .in('codigo_interno', codigos)
      .eq('activo', true),
  ])

  if (!items || items.length === 0) {
    return NextResponse.json({ habilitado: true, porCodigo: {} })
  }

  // El precio de lista sale del producto de la tienda: es el mismo artículo, y así
  // el "antes / ahora" del panel compara contra lo que la card ya muestra.
  const precioPorCodigo = new Map<string, { precio: number; iva: number | null; moneda: string | null }>()
  for (const p of productos ?? []) {
    const row = p as unknown as Record<string, unknown>
    const { precio } = aplicarTipoCambio(
      (row[listaPrecio] ?? null) as number | null,
      (row.moneda ?? null) as string | null,
      tipoCambioUsd,
    )
    if (precio === null) continue
    precioPorCodigo.set(row.codigo_interno as string, {
      precio,
      iva: (row.iva ?? null) as number | null,
      moneda: null,
    })
  }

  // El embed to-one de PostgREST llega como objeto, no como array.
  type Fila = {
    id: number
    producto_id: number | null
    codigo_interno: string
    variante: string | null
    cantidad: number
    comprometido: number
    precio_base: number | null
    containers: {
      id: string
      nombre: string
      etapa: EtapaContainer
      descuento_china: number
      descuento_oceano: number
      fecha_arribo_est: string | null
      orden: number
    }
  }

  const porCodigo: DisponibilidadPorCodigo = {}

  for (const fila of items as unknown as Fila[]) {
    const c = fila.containers
    if (!c) continue

    // Producto no habilitado para el canal: no existe para este cliente, ni en
    // tienda ni en preventa.
    if (fila.producto_id == null || !permitidos.has(fila.producto_id)) continue

    const base = precioPorCodigo.get(fila.codigo_interno)
    if (!base) continue

    const disponible = Math.max(fila.cantidad - fila.comprometido, 0)
    const descuentoPct = descuentoVigente(c)
    const precioLista = fila.precio_base != null ? Math.round(Number(fila.precio_base)) : base.precio
    const precio = precioConDescuento(precioLista, descuentoPct)

    const lista = (porCodigo[fila.codigo_interno] ??= [])
    let viaje = lista.find(v => v.containerId === c.id)
    if (!viaje) {
      viaje = {
        containerId: c.id,
        nombre: c.nombre,
        productoId: fila.producto_id,
        codigoInterno: fila.codigo_interno,
        etapa: c.etapa,
        fechaArribo: c.fecha_arribo_est,
        descuentoPct,
        aceptaReservas: aceptaReservas(c.etapa),
        moneda: base.moneda,
        multiplo: multiplos[fila.producto_id] ?? 1,
        colores: [],
      } satisfies ViajeDisponible
      lista.push(viaje)
    }

    viaje.colores.push({
      itemId: fila.id,
      variante: fila.variante,
      disponible,
      precio,
      precioLista,
      neto: netoDesdeBruto(precio, base.iva),
      netoLista: netoDesdeBruto(precioLista, base.iva),
    })
  }

  // Primero lo que llega antes: es lo que el cliente pregunta cuando aprieta
  // "¿Cuándo viene?".
  for (const lista of Object.values(porCodigo)) {
    lista.sort((a, b) => (a.fechaArribo ?? '9999').localeCompare(b.fechaArribo ?? '9999'))
    for (const v of lista) {
      v.colores.sort((a, b) => (a.variante ?? '').localeCompare(b.variante ?? '', 'es'))
    }
  }

  return NextResponse.json({ habilitado: true, porCodigo })
}
