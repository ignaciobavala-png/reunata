import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { resolverCanalTienda } from '@/lib/tienda'
import { aplicarTipoCambio } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const ids: number[] = Array.isArray(body?.ids) ? body.ids.filter(Number.isInteger) : []

  if (ids.length === 0) {
    return NextResponse.json({ precios: {} })
  }

  const service = createServiceClient()
  const { listaPrecio, mostrarPrecios, tipoCambioUsd } = await resolverCanalTienda()

  if (!mostrarPrecios || !listaPrecio) {
    return NextResponse.json({ precios: {} })
  }

  const [{ data: productos }, { data: tcRow }] = await Promise.all([
    service
      .from('productos')
      .select('id, precio_lista3, precio_lista5, moneda, stock, iva')
      .in('id', ids)
      .eq('activo', true),
    service
      .from('configuracion')
      .select('valor')
      .eq('clave', 'tipo_cambio_usd')
      .maybeSingle(),
  ])

  const tc = parseFloat(tcRow?.valor ?? '1') || 1

  const esConsumidor = listaPrecio === 'precio_lista5'
  const precios: Record<number, number> = {}
  const stocks: Record<number, number | null> = {}
  for (const prod of productos ?? []) {
    const precioRaw = (prod[listaPrecio as 'precio_lista3' | 'precio_lista5'] ?? null) as number | null
    const { precio } = aplicarTipoCambio(precioRaw, prod.moneda ?? null, tc)
    if (precio !== null) {
      // Consumidor final ve precios con IVA incluido — coherencia con la tienda
      const ivaRate = esConsumidor ? ((prod.iva as number | null) ?? 21) / 100 : 0
      precios[prod.id] = esConsumidor ? Math.round(precio * (1 + ivaRate)) : precio
    }
    stocks[prod.id] = prod.stock ?? null
  }

  return NextResponse.json({ precios, stocks })
}
