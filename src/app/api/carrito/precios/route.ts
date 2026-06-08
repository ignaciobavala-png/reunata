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
      .select('id, precio_lista3, precio_lista5, moneda')
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
  for (const prod of productos ?? []) {
    const precioRaw = (prod[listaPrecio as 'precio_lista3' | 'precio_lista5'] ?? null) as number | null
    const { precio } = aplicarTipoCambio(precioRaw, prod.moneda ?? null, tc)
    if (precio !== null) precios[prod.id] = precio
  }

  return NextResponse.json({ precios })
}
