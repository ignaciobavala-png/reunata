export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { resolverCanalTienda, getProductosDelCanal } from '@/lib/tienda'
import { ProductGridPublic } from '@/components/sections/ProductGridPublic'
import { PendingApproval } from '@/components/sections/PendingApproval'
import { aplicarTipoCambio } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Favoritos — Reunata',
  description: 'Los productos seleccionados por Reunata.',
}

export default async function FavoritosPage() {
  const supabase = createServiceClient()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const canalInfo = await resolverCanalTienda()
  const { user, canalId, listaPrecio, mostrarPrecios, pendienteAprobacion, tipoCambioUsd } = canalInfo

  if (pendienteAprobacion) return <PendingApproval nombre={user?.nombre} />

  const { ids: idsCanal, multiplos } = await getProductosDelCanal(canalId)

  const { data: fotosDestacadas } = await supabase
    .from('producto_fotos')
    .select('producto_id, url, orden, productos(id, titulo, codigo_interno, moneda, precio_lista3, precio_lista5)')
    .eq('destacada', true)
    .in('producto_id', idsCanal.length > 0 ? idsCanal : [-1])
    .order('orden')

  // Un producto puede tener varias fotos destacadas; deduplicar por producto_id
  const vistos = new Set<number>()
  const productos = (fotosDestacadas ?? []).flatMap((f) => {
    const producto = Array.isArray(f.productos) ? f.productos[0] : (f.productos as typeof f.productos | null)
    if (!producto || vistos.has(f.producto_id)) return []
    vistos.add(f.producto_id)
    const precioRaw = mostrarPrecios && listaPrecio
      ? ((producto as Record<string, unknown>)[listaPrecio] as number | null) ?? null
      : null
    const { precio, moneda } = aplicarTipoCambio(precioRaw, (producto as { moneda?: string | null }).moneda ?? null, tipoCambioUsd)
    return [{
      id: f.producto_id,
      titulo: (producto as { titulo: string }).titulo,
      codigo_interno: (producto as { codigo_interno: string }).codigo_interno,
      foto_url: f.url,
      precio,
      moneda,
      multiplo: multiplos[f.producto_id] ?? 1,
      supabaseUrl,
    }]
  })

  return (
    <main style={{ background: 'var(--background)' }}>
      <div className="px-6 md:px-16 max-w-5xl mx-auto py-20 md:py-28">
        <nav
          className="text-xs tracking-widest uppercase mb-6 flex items-center gap-2"
          style={{ color: 'var(--color-acero-oscuro)' }}
        >
          <Link href="/tienda" className="hover:underline">Tienda</Link>
          <span>/</span>
          <span style={{ color: 'var(--foreground)' }}>Favoritos</span>
        </nav>

        <h1
          className="text-3xl md:text-5xl mb-2"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}
        >
          Favoritos
        </h1>
        <p className="text-sm mb-12" style={{ color: 'var(--color-acero-oscuro)' }}>
          {productos.length > 0
            ? 'Nuestra selección de productos destacados.'
            : 'No hay productos destacados por el momento.'}
        </p>

        {productos.length > 0 && (
          <ProductGridPublic
            productos={productos}
            nombreCategoria="Favoritos"
            mostrarPrecios={mostrarPrecios}
            estaLogueado={!!user}
          />
        )}
      </div>
    </main>
  )
}
