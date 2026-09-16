import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resolverCanalTienda } from '@/lib/tienda'
import { aplicarTipoCambio } from '@/lib/utils'
import { stockDisponible } from '@/lib/stock'
import {
  ETAPAS_VISIBLES,
  aceptaReservas,
  descuentoVigente,
  precioConDescuento,
  type EtapaContainer,
} from '@/lib/containers'

interface ItemBody {
  productoId: number
  variante?: string | null
  /** Presente solo en las líneas de preventa. */
  containerItemId?: number | null
}

/** Lo que el carrito necesita saber de una línea de preventa, ya revalidado. */
interface PreventaVigente {
  precio: number
  precioLista: number
  descuentoEtapaPct: number
  disponible: number
  /** false = el viaje dejó de tomar pedidos; la línea ya no se puede comprar. */
  vigente: boolean
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  // Acepta el formato nuevo (items con variante) y, por compatibilidad, el viejo (ids planos).
  const items: ItemBody[] = Array.isArray(body?.items)
    ? body.items.filter((i: unknown): i is ItemBody => typeof (i as ItemBody)?.productoId === 'number')
    : Array.isArray(body?.ids)
      ? body.ids.filter(Number.isInteger).map((id: number) => ({ productoId: id }))
      : []

  if (items.length === 0) {
    return NextResponse.json({ precios: {} })
  }

  const service = createServiceClient()
  const { listaPrecio, mostrarPrecios, tipoCambioUsd } = await resolverCanalTienda()

  if (!mostrarPrecios || !listaPrecio) {
    return NextResponse.json({ precios: {} })
  }

  const ids = [...new Set(items.map(i => i.productoId))]

  const [{ data: productos }, { data: tcRow }] = await Promise.all([
    service
      .from('productos')
      .select('id, precio_lista1, precio_lista2, precio_lista3, precio_lista4, precio_lista5, moneda, stock, variantes, iva')
      .in('id', ids)
      .eq('activo', true),
    service
      .from('configuracion')
      .select('valor')
      .eq('clave', 'tipo_cambio_usd')
      .maybeSingle(),
  ])

  const tc = parseFloat(tcRow?.valor ?? '1') || 1

  const precios: Record<number, number> = {}
  const stocks: Record<string, number | null> = {}
  const ivaRates: Record<number, number> = {}
  for (const prod of productos ?? []) {
    const precioRaw = ((prod as Record<string, unknown>)[listaPrecio] ?? null) as number | null
    const { precio } = aplicarTipoCambio(precioRaw, prod.moneda ?? null, tc)
    const ivaRate = ((prod.iva as number | null) ?? 21) / 100
    if (precio !== null) {
      // El precio de la lista se devuelve tal cual: precio_lista5 (consumidor) ya incluye
      // IVA y precio_lista3 (mayorista) es neto. ivaRate viaja aparte para el desglose.
      precios[prod.id] = precio
    }
    ivaRates[prod.id] = ivaRate
  }

  // Stock por itemKey (`${productoId}:${variante ?? ''}`) — cada color se valida por separado.
  for (const item of items) {
    const key = `${item.productoId}:${item.variante ?? ''}`
    const prod = productos?.find(p => p.id === item.productoId)
    stocks[key] = prod ? stockDisponible(prod, item.variante) : null
  }

  // ── Preventa ────────────────────────────────────────────────────────────
  // El precio de la etapa "En viaje" sube todos los días, así que un carrito de
  // hace tres días muestra un número que ya no existe. El server igual lo
  // recalcula al confirmar el pedido (ver pedidos.ts), pero sin esto el drawer
  // diría una cosa y el pedido guardaría otra — y la diferencia siempre es en
  // contra del cliente, que es la peor forma de enterarse.
  const preventa: Record<string, PreventaVigente> = {}
  const idsViaje = [...new Set(
    items.map(i => i.containerItemId).filter((id): id is number => Number.isInteger(id)),
  )]

  if (idsViaje.length > 0) {
    // Sin permiso el mapa queda vacío: no se filtra precio de viaje a quien no
    // corresponde, igual que en el endpoint de disponibilidad.
    const supabase = await createClient()
    const { data: habilitado } = await supabase.rpc('puede_containers')

    if (habilitado) {
      type Fila = {
        id: number
        cantidad: number
        comprometido: number
        precio_base: number | null
        producto_id: number | null
        containers: {
          etapa: EtapaContainer
          descuento_china: number
          descuento_oceano: number
          oceano_desde: string | null
          oceano_dias: number | null
        }
      }

      const { data: filas } = await service
        .from('container_items')
        .select(`
          id, cantidad, comprometido, precio_base, producto_id,
          containers!inner (
            etapa, descuento_china, descuento_oceano, oceano_desde, oceano_dias
          )
        `)
        .in('id', idsViaje)
        .in('containers.etapa', ETAPAS_VISIBLES)

      const porId = new Map<number, Fila>()
      for (const f of (filas ?? []) as unknown as Fila[]) porId.set(f.id, f)

      for (const item of items) {
        if (!Number.isInteger(item.containerItemId)) continue
        const key = `${item.productoId}:${item.variante ?? ''}:c${item.containerItemId}`
        const fila = porId.get(item.containerItemId as number)

        if (!fila || !aceptaReservas(fila.containers.etapa)) {
          preventa[key] = { precio: 0, precioLista: 0, descuentoEtapaPct: 0, disponible: 0, vigente: false }
          continue
        }

        // El override del viaje pisa la lista del canal, igual que en el panel.
        const lista = fila.precio_base != null
          ? Math.round(Number(fila.precio_base))
          : precios[item.productoId]
        if (lista == null) continue

        const pct = descuentoVigente(fila.containers)
        preventa[key] = {
          precio: precioConDescuento(lista, pct),
          precioLista: lista,
          descuentoEtapaPct: pct,
          disponible: Math.max(fila.cantidad - fila.comprometido, 0),
          vigente: true,
        }
      }
    }
  }

  return NextResponse.json({ precios, stocks, ivaRates, preventa })
}
