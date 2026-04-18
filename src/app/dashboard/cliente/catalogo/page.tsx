import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CatalogoClient } from './CatalogoClient'
import { CartDrawer } from '@/components/cliente/CartDrawer'

const LISTA_CAMPO: Record<string, string> = {
  precio_lista1: 'precio_lista1',
  precio_lista2: 'precio_lista2',
  precio_lista3: 'precio_lista3',
  precio_lista4: 'precio_lista4',
  precio_lista5: 'precio_lista5',
}

export default async function CatalogoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Obtener canal del cliente
  const { data: profile } = await supabase
    .from('profiles')
    .select('canal_id, aprobado')
    .eq('id', user.id)
    .single()

  if (!profile?.aprobado) redirect('/dashboard/cliente')

  let productos: { id: number; codigo_interno: string; titulo: string; categoria: string | null; stock: number | null; precio: number }[] = []

  if (profile.canal_id) {
    // Obtener lista de precios del canal
    const { data: canal } = await supabase
      .from('canales')
      .select('lista_precios')
      .eq('id', profile.canal_id)
      .single()

    const listaCampo = LISTA_CAMPO[canal?.lista_precios ?? 'precio_lista1'] ?? 'precio_lista1'

    // Obtener productos asignados al canal con la columna de precio correcta
    const { data: rows } = await supabase
      .from('producto_canales')
      .select(`productos!inner (
        id, codigo_interno, titulo, categoria, stock,
        precio_lista1, precio_lista2, precio_lista3, precio_lista4, precio_lista5
      )`)
      .eq('canal_id', profile.canal_id)

    productos = (rows ?? [])
      .map(r => {
        const p = r.productos as unknown as Record<string, unknown>
        return {
          id: p.id as number,
          codigo_interno: p.codigo_interno as string,
          titulo: p.titulo as string,
          categoria: p.categoria as string | null,
          stock: p.stock as number | null,
          precio: (p[listaCampo] as number) ?? 0,
        }
      })
      .filter(p => p.precio > 0)
      .sort((a, b) => (a.categoria ?? '').localeCompare(b.categoria ?? '') || a.titulo.localeCompare(b.titulo))
  }

  const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))] as string[]

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Catálogo
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--color-acero-oscuro)' }}>
        Productos disponibles para tu canal. Precios en USD.
      </p>

      {profile.canal_id ? (
        <>
          <CatalogoClient productos={productos} categorias={categorias} />
          <CartDrawer />
        </>
      ) : (
        <div className="text-sm py-8" style={{ color: 'var(--color-acero-oscuro)' }}>
          Tu cuenta aún no tiene un canal de venta asignado. Contactá con tu vendedor.
        </div>
      )}
    </div>
  )
}
