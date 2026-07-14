import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { resolverCanalTienda } from '@/lib/tienda'
import { aplicarTipoCambio } from '@/lib/utils'
import { stockDisponible } from '@/lib/stock'

interface ItemBody {
  productoId: number
  variante?: string | null
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

  return NextResponse.json({ precios, stocks, ivaRates })
}
