import { createClient } from '@/lib/supabase/server'
import { Search } from 'lucide-react'

interface SearchParams { q?: string; categoria?: string }

export default async function ProductosPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { q, categoria } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('productos')
    .select('id, codigo_interno, titulo, categoria, stock, precio_lista1, precio_lista2, precio_lista3, precio_lista4, precio_lista5, precio_compra, activo, ultima_sync')
    .order('titulo')

  if (q) query = query.ilike('titulo', `%${q}%`)
  if (categoria) query = query.eq('categoria', categoria)

  const { data: productos } = await query.limit(200)

  const { data: categorias } = await supabase
    .from('productos')
    .select('categoria')
    .not('categoria', 'is', null)
    .order('categoria')

  const categoriasUnicas = [...new Set(categorias?.map(c => c.categoria).filter(Boolean))]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
            Productos
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
            {productos?.length ?? 0} productos sincronizados desde Gesu
          </p>
        </div>
      </div>

      {/* Filtros */}
      <form className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-acero)' }} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar producto…"
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border outline-none"
            style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
          />
        </div>
        <select
          name="categoria"
          defaultValue={categoria}
          className="px-3 py-2.5 text-sm rounded-lg border outline-none"
          style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
        >
          <option value="">Todas las categorías</option>
          {categoriasUnicas.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-2.5 text-xs rounded-lg tracking-wide"
          style={{ background: 'var(--color-granito)', color: 'var(--color-acero-brillo)' }}
        >
          Filtrar
        </button>
      </form>

      {/* Tabla */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-acero-claro)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--color-acero-brillo)', borderBottom: '1px solid var(--color-acero-claro)' }}>
                {['Código', 'Producto', 'Categoría', 'Stock', 'Lista 1', 'Lista 2', 'Lista 3', 'Costo', 'Estado'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium tracking-wide" style={{ color: 'var(--color-granito-claro)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {productos?.map((p, i) => (
                <tr
                  key={p.id}
                  style={{
                    background: i % 2 === 0 ? 'white' : 'var(--color-acero-brillo)',
                    borderBottom: '1px solid var(--color-acero-claro)',
                  }}
                >
                  <td className="px-4 py-3 font-mono" style={{ color: 'var(--color-acero-oscuro)' }}>{p.codigo_interno}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate" style={{ color: 'var(--foreground)' }}>{p.titulo}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-acero-oscuro)' }}>{p.categoria ?? '—'}</td>
                  <td className="px-4 py-3" style={{ color: p.stock === 0 ? '#ef4444' : 'var(--foreground)' }}>
                    {p.stock ?? '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--foreground)' }}>
                    {p.precio_lista1 ? `u$s ${p.precio_lista1.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--foreground)' }}>
                    {p.precio_lista2 ? `u$s ${p.precio_lista2.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--foreground)' }}>
                    {p.precio_lista3 ? `u$s ${p.precio_lista3.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-acero-oscuro)' }}>
                    {p.precio_compra ? `u$s ${p.precio_compra.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        background: p.activo ? '#dcfce7' : '#fee2e2',
                        color: p.activo ? '#16a34a' : '#dc2626',
                      }}
                    >
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
              {(!productos || productos.length === 0) && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
                    No hay productos. Ejecutá una sincronización desde el panel de Sync.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
