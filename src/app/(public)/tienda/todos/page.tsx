export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { resolverCanalTienda, getProductosDelCanal } from '@/lib/tienda'
import { aplicarTipoCambio } from '@/lib/utils'
import { PendingApproval } from '@/components/sections/PendingApproval'
import { TodosClient } from './TodosClient'

export const metadata: Metadata = {
  title: 'Todos los productos — Reunata',
  description: 'Catálogo completo de Reunata. Filtrá por categoría, color y precio.',
  alternates: { canonical: '/tienda/todos' },
}

export default async function TodosProductosPage() {
  const supabase = createServiceClient()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const canalInfo = await resolverCanalTienda()
  const { user, canalId, listaPrecio, mostrarPrecios, pendienteAprobacion, tipoCambioUsd } = canalInfo

  if (pendienteAprobacion) return <PendingApproval nombre={user?.nombre} />

  const { ids: idsCanal, multiplos } = await getProductosDelCanal(canalId)
  const filterCanal = idsCanal.length > 0 ? idsCanal : [-1]

  const { data: rawProductos } = await supabase
    .from('productos')
    .select('id, titulo, codigo_interno, categoria, moneda, iva, variantes, created_at, precio_lista1, precio_lista2, precio_lista3, precio_lista4, precio_lista5, producto_fotos(url, orden)')
    .eq('activo', true)
    .in('id', filterCanal)
    .order('titulo')

  const esMayorista = ['distribuidor', 'local', 'mercha', 'fabricantes'].includes(user?.rol ?? '')

  const productos = (rawProductos ?? []).map(p => {
    const fotos = ((p.producto_fotos ?? []) as { url: string; orden: number }[]).sort((a, b) => a.orden - b.orden)
    const precioRaw = mostrarPrecios && listaPrecio
      ? ((p as Record<string, unknown>)[listaPrecio] as number | null) ?? null
      : null
    const { precio, moneda } = aplicarTipoCambio(precioRaw, p.moneda ?? null, tipoCambioUsd)
    return {
      id: p.id,
      titulo: p.titulo,
      codigo_interno: p.codigo_interno,
      categoria: p.categoria ?? '',
      foto_url: fotos[0]?.url ?? null,
      precio,
      moneda,
      iva: (p.iva as number | null) ?? 21,
      multiplo: multiplos[p.id] ?? 1,
      variantes: (p.variantes as { nombre: string; stock: number }[] | null) ?? null,
      created_at: p.created_at as string,
      supabaseUrl,
    }
  })

  return (
    <main style={{ background: 'var(--background)' }}>
      <div className="px-6 md:px-16 max-w-7xl mx-auto py-20 md:py-28">
        <nav className="text-xs tracking-widest uppercase mb-6 flex items-center gap-2" style={{ color: 'var(--color-acero-oscuro)' }}>
          <Link href="/tienda" className="hover:underline">Tienda</Link>
          <span>/</span>
          <span style={{ color: 'var(--foreground)' }}>Todos los productos</span>
        </nav>
        <h1 className="text-3xl md:text-5xl mb-8" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
          Todos los productos
        </h1>
        <TodosClient
          productos={productos}
          mostrarPrecios={mostrarPrecios}
          esMayorista={esMayorista}
          estaLogueado={!!user}
          aplicaIva={listaPrecio === 'precio_lista5'}
        />
      </div>
    </main>
  )
}
