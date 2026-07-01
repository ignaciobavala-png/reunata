import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { resolverCanalTienda } from '@/lib/tienda'

export async function GET(request: NextRequest) {
  const { canalId } = await resolverCanalTienda()
  const idsParam = request.nextUrl.searchParams.get('ids') ?? ''
  const productoIds = idsParam.split(',').map(Number).filter(n => Number.isInteger(n) && n > 0)

  if (!canalId || productoIds.length === 0) return NextResponse.json({ descuentos: {} })

  const service = createServiceClient()
  const { data } = await service
    .from('producto_canales')
    .select('producto_id, descuento_volumen_cantidad_minima, descuento_volumen_pct')
    .eq('canal_id', canalId)
    .in('producto_id', productoIds)

  const descuentos: Record<number, { cantidadMinima: number; pct: number }> = {}
  for (const row of data ?? []) {
    if (row.descuento_volumen_cantidad_minima != null && row.descuento_volumen_pct != null) {
      descuentos[row.producto_id] = { cantidadMinima: row.descuento_volumen_cantidad_minima, pct: row.descuento_volumen_pct }
    }
  }
  return NextResponse.json({ descuentos })
}
