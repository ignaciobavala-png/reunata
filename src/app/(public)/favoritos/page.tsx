export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resolverCanalTienda, getProductosDelCanal, esMayoristaPorCanal } from '@/lib/tienda'
import { ProductGridPublic } from '@/components/sections/ProductGridPublic'
import { PendingApproval } from '@/components/sections/PendingApproval'
import { aplicarTipoCambio } from '@/lib/utils'
import { stockDisponible } from '@/lib/stock'

export const metadata: Metadata = {
  title: 'Favoritos — Reunata',
  description: 'Los productos que guardaste.',
}

export default async function FavoritosPage() {
  const service = createServiceClient()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const authClient = await createClient()
  const [canalInfo, { data: { user: authUser } }] = await Promise.all([
    resolverCanalTienda(),
    authClient.auth.getUser(),
  ])

  const { user, canalId, listaPrecio, mostrarPrecios, pendienteAprobacion, tipoCambioUsd } = canalInfo

  if (pendienteAprobacion) return <PendingApproval nombre={user?.nombre} />

  if (!authUser) {
    return (
      <main style={{ background: 'var(--background)' }}>
        <div className="px-6 md:px-16 max-w-3xl mx-auto py-28 md:py-36 flex flex-col items-center text-center gap-6">
          <h1 className="text-3xl md:text-5xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
            Favoritos
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
            Iniciá sesión para ver los productos que guardaste.
          </p>
          <Link
            href="/login?next=/favoritos"
            className="px-6 py-3 text-xs tracking-widest uppercase transition-opacity hover:opacity-80"
            style={{ background: 'var(--color-granito-oscuro)', color: 'var(--color-acero-brillo)' }}
          >
            Iniciar sesión
          </Link>
        </div>
      </main>
    )
  }

  const { data: favs } = await authClient.from('favoritos').select('producto_id')
  const favIds = (favs ?? []).map(f => f.producto_id as number)

  const { ids: idsCanal, multiplos } = await getProductosDelCanal(canalId)
  const idsCanalSet = new Set(idsCanal)
  const idsValidos = favIds.filter(id => idsCanalSet.has(id))

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
  }

  let productos: ProductoPublico[] = []

  if (idsValidos.length > 0) {
    const { data: prods } = await service
      .from('productos')
      .select('id, titulo, codigo_interno, moneda, stock, stock_visible, variantes, precio_lista1, precio_lista2, precio_lista3, precio_lista4, precio_lista5, producto_fotos(url, orden)')
      .in('id', idsValidos)
      .eq('activo', true)
      .order('titulo')

    productos = (prods ?? []).map(p => {
      const fotos = ((p.producto_fotos ?? []) as { url: string; orden: number }[]).sort((a, b) => a.orden - b.orden)
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
        variantes: (p.variantes as { nombre: string; stock: number }[] | null) ?? null,
        stock: stockDisponible({
          stock: (p.stock as number | null) ?? null,
          stock_visible: (p.stock_visible as number | null) ?? null,
        }),
      }
    })
  }

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
            ? `${productos.length} producto${productos.length !== 1 ? 's' : ''} guardado${productos.length !== 1 ? 's' : ''}.`
            : 'Todavía no guardaste ningún producto. Hacé click en el corazón de cualquier producto para agregarlo acá.'}
        </p>

        {productos.length > 0 && (
          <ProductGridPublic
            productos={productos}
            nombreCategoria="Favoritos"
            mostrarPrecios={mostrarPrecios}
            estaLogueado={!!user}
            esMayorista={esMayoristaPorCanal(user)}
          />
        )}
      </div>
    </main>
  )
}
