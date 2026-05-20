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

const MOCK_PRODUCTOS = [
  { id: -1,  codigo_interno: 'BOL-001', titulo: 'Bolsa tejida premium',         categoria: 'Bolsas',    stock: 50,  precio: 8.50  },
  { id: -2,  codigo_interno: 'BOL-002', titulo: 'Bolsa de tela estampada',       categoria: 'Bolsas',    stock: 80,  precio: 6.00  },
  { id: -3,  codigo_interno: 'BOL-003', titulo: 'Bolsa de cuero sintético',      categoria: 'Bolsas',    stock: 30,  precio: 14.00 },
  { id: -4,  codigo_interno: 'NEC-001', titulo: 'Neceser con cierre dorado',     categoria: 'Neceseres', stock: 40,  precio: 11.00 },
  { id: -5,  codigo_interno: 'NEC-002', titulo: 'Neceser transparente doble',    categoria: 'Neceseres', stock: 60,  precio: 7.50  },
  { id: -6,  codigo_interno: 'ACC-001', titulo: 'Billetera minimalista',         categoria: 'Accesorios',stock: 100, precio: 9.00  },
  { id: -7,  codigo_interno: 'ACC-002', titulo: 'Monedero con broche',           categoria: 'Accesorios',stock: 75,  precio: 5.50  },
  { id: -8,  codigo_interno: 'ACC-003', titulo: 'Porta documentos ejecutivo',    categoria: 'Accesorios',stock: 20,  precio: 16.00 },
]

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ cart?: string }>
}) {
  const { cart } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('canal_id, aprobado, rol')
    .eq('id', user.id)
    .single()

  const tipoCliente: 'mayorista' | 'minorista' =
    ['distribuidor', 'local', 'mercha'].includes(profile?.rol ?? '')
      ? 'mayorista'
      : 'minorista'

  let productos: { id: number; codigo_interno: string; titulo: string; categoria: string | null; stock: number | null; precio: number }[] = []
  let esMock = false

  if (profile?.canal_id) {
    const { data: canal } = await supabase
      .from('canales')
      .select('lista_precios')
      .eq('id', profile.canal_id)
      .single()

    const listaCampo = LISTA_CAMPO[canal?.lista_precios ?? 'precio_lista1'] ?? 'precio_lista1'

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
  } else {
    productos = MOCK_PRODUCTOS
    esMock = true
  }

  const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))] as string[]

  const subtitulo = tipoCliente === 'mayorista'
    ? 'Productos disponibles para tu canal. Precios en USD.'
    : 'Explorá nuestros productos. Agregá al carrito y pedí por WhatsApp.'

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        {tipoCliente === 'mayorista' ? 'Catálogo mayorista' : 'Catálogo'}
      </h1>
      <p className="text-base mb-2" style={{ color: 'var(--color-acero-oscuro)' }}>
        {subtitulo}
      </p>

      {esMock && (
        <div
          className="mb-6 px-4 py-3 rounded-lg text-sm border"
          style={{
            background: 'var(--color-acero-brillo)',
            borderColor: 'var(--color-acero-claro)',
            color: 'var(--color-acero-oscuro)',
          }}
        >
          {tipoCliente === 'mayorista'
            ? 'Tu canal de venta aún no fue asignado. Estás viendo productos de muestra — los precios reales aparecerán una vez aprobada tu cuenta.'
            : 'Estás viendo productos de muestra. Los precios finales se confirman al hacer el pedido.'}
        </div>
      )}

      <CatalogoClient productos={productos} categorias={categorias} tipoCliente={tipoCliente} />
      <CartDrawer tipoCliente={tipoCliente} initialOpen={cart === 'open'} />
    </div>
  )
}
