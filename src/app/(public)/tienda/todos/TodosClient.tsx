'use client'

import { useState, useMemo } from 'react'
import { ProductGridPublic } from '@/components/sections/ProductGridPublic'
import { SlidersHorizontal, X } from 'lucide-react'

const COLORES_CONOCIDOS = new Set([
  'NEGRO', 'BLANCO', 'ROJO', 'AZUL', 'VERDE', 'ROSA', 'GRIS',
  'AMARILLO', 'NARANJA', 'LILA', 'AQUA', 'MANTECA', 'CHOCOLATE',
  'BEIGE', 'DORADO', 'PLATEADO', 'BORDÓ', 'BORDO', 'TURQUESA',
  'VIOLETA', 'CELESTE', 'SURTIDO', 'NUDE', 'TERRACOTA', 'OCRE',
  'AZUL MARINO', 'VERDE MILITAR', 'ROSA PASTEL',
])

type Orden = 'relevancia' | 'nuevo' | 'precio_asc' | 'precio_desc'

export type ProductoTodos = {
  id: number
  titulo: string
  codigo_interno: string
  categoria: string
  foto_url: string | null
  precio: number | null
  moneda?: string | null
  iva?: number | null
  multiplo?: number
  variantes?: { nombre: string; stock: number }[] | null
  stock?: number | null
  created_at: string
  supabaseUrl: string
}

function toggleSet(set: Set<string>, val: string): Set<string> {
  const next = new Set(set)
  if (next.has(val)) next.delete(val)
  else next.add(val)
  return next
}

function FiltroSeccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        className="text-[10px] tracking-[0.25em] uppercase mb-3"
        style={{ color: 'var(--color-acero-oscuro)' }}
      >
        {titulo}
      </p>
      {children}
    </div>
  )
}

export function TodosClient({
  productos,
  mostrarPrecios,
  esMayorista,
  estaLogueado,
  aplicaIva,
  nombreCategoria = 'todos los productos',
}: {
  productos: ProductoTodos[]
  mostrarPrecios: boolean
  esMayorista: boolean
  estaLogueado: boolean
  aplicaIva: boolean
  nombreCategoria?: string
}) {
  const [categoriasSel, setCategoriasSel] = useState<Set<string>>(new Set())
  const [coloresSel, setColoresSel] = useState<Set<string>>(new Set())
  const [precioMin, setPrecioMin] = useState('')
  const [precioMax, setPrecioMax] = useState('')
  const [orden, setOrden] = useState<Orden>('relevancia')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const categorias = useMemo(() => {
    const cats = new Set(productos.map(p => p.categoria).filter(Boolean))
    return [...cats].sort()
  }, [productos])

  const colores = useMemo(() => {
    const cols = new Set<string>()
    productos.forEach(p => {
      p.variantes?.forEach(v => {
        const n = v.nombre.toUpperCase()
        if (COLORES_CONOCIDOS.has(n)) cols.add(n)
      })
    })
    return [...cols].sort()
  }, [productos])

  const resultado = useMemo(() => {
    let list = [...productos]

    if (categoriasSel.size > 0)
      list = list.filter(p => categoriasSel.has(p.categoria))

    if (coloresSel.size > 0)
      list = list.filter(p => p.variantes?.some(v => coloresSel.has(v.nombre.toUpperCase())))

    const min = precioMin ? Number(precioMin) : null
    const max = precioMax ? Number(precioMax) : null
    if (min !== null || max !== null) {
      list = list.filter(p => {
        if (p.precio === null) return false
        if (min !== null && p.precio < min) return false
        if (max !== null && p.precio > max) return false
        return true
      })
    }

    if (orden === 'nuevo')
      list = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at))
    else if (orden === 'precio_asc')
      list = [...list].sort((a, b) => (a.precio ?? 0) - (b.precio ?? 0))
    else if (orden === 'precio_desc')
      list = [...list].sort((a, b) => (b.precio ?? 0) - (a.precio ?? 0))

    return list
  }, [productos, categoriasSel, coloresSel, precioMin, precioMax, orden])

  const hayFiltros = categoriasSel.size > 0 || coloresSel.size > 0 || !!precioMin || !!precioMax

  function limpiarFiltros() {
    setCategoriasSel(new Set())
    setColoresSel(new Set())
    setPrecioMin('')
    setPrecioMax('')
  }

  const panelFiltros = (
    <div className="flex flex-col gap-6">
      <FiltroSeccion titulo="Ordenar">
        {([
          ['relevancia', 'Relevancia'],
          ['nuevo', 'Lo más nuevo'],
          ['precio_asc', 'Menor precio'],
          ['precio_desc', 'Mayor precio'],
        ] as [Orden, string][]).map(([val, label]) => (
          <label key={val} className="flex items-center gap-2 py-1 cursor-pointer">
            <input
              type="radio"
              name="orden"
              checked={orden === val}
              onChange={() => setOrden(val)}
              className="accent-[var(--color-granito)]"
            />
            <span className="text-xs" style={{ color: 'var(--foreground)' }}>{label}</span>
          </label>
        ))}
      </FiltroSeccion>

      {/* Con una sola categoría (páginas /tienda/[slug]) el filtro no aporta nada */}
      {categorias.length > 1 && (
      <FiltroSeccion titulo="Categoría">
        {categorias.map(cat => (
          <label key={cat} className="flex items-center gap-2 py-1 cursor-pointer">
            <input
              type="checkbox"
              checked={categoriasSel.has(cat)}
              onChange={() => setCategoriasSel(prev => toggleSet(prev, cat))}
              className="accent-[var(--color-granito)]"
            />
            <span className="text-xs" style={{ color: 'var(--foreground)' }}>{cat}</span>
          </label>
        ))}
      </FiltroSeccion>
      )}

      {colores.length > 0 && (
        <FiltroSeccion titulo="Color">
          {colores.map(col => (
            <label key={col} className="flex items-center gap-2 py-1 cursor-pointer">
              <input
                type="checkbox"
                checked={coloresSel.has(col)}
                onChange={() => setColoresSel(prev => toggleSet(prev, col))}
                className="accent-[var(--color-granito)]"
              />
              <span className="text-xs capitalize" style={{ color: 'var(--foreground)' }}>
                {col.charAt(0) + col.slice(1).toLowerCase()}
              </span>
            </label>
          ))}
        </FiltroSeccion>
      )}

      {mostrarPrecios && (
        <FiltroSeccion titulo="Precio">
          <div className="flex gap-2 items-center">
            <input
              type="number"
              placeholder="Mín"
              value={precioMin}
              onChange={e => setPrecioMin(e.target.value)}
              className="w-full text-xs px-2 py-1.5 rounded border outline-none"
              style={{
                borderColor: 'var(--color-acero-claro)',
                color: 'var(--foreground)',
                background: 'var(--background)',
              }}
            />
            <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-acero-oscuro)' }}>—</span>
            <input
              type="number"
              placeholder="Máx"
              value={precioMax}
              onChange={e => setPrecioMax(e.target.value)}
              className="w-full text-xs px-2 py-1.5 rounded border outline-none"
              style={{
                borderColor: 'var(--color-acero-claro)',
                color: 'var(--foreground)',
                background: 'var(--background)',
              }}
            />
          </div>
        </FiltroSeccion>
      )}

      {hayFiltros && (
        <button
          onClick={limpiarFiltros}
          className="text-xs underline text-left"
          style={{ color: 'var(--color-acero-oscuro)' }}
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )

  return (
    <div>
      {/* Mobile: botón filtrar */}
      <div className="flex items-center justify-between mb-6 md:hidden">
        <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
          {resultado.length} producto{resultado.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setFiltersOpen(v => !v)}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border"
          style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
        >
          <SlidersHorizontal size={12} />
          Filtrar
          {hayFiltros && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-granito)]" />
          )}
        </button>
      </div>

      {/* Mobile: panel de filtros desplegable */}
      {filtersOpen && (
        <div
          className="md:hidden mb-6 p-4 rounded-xl border"
          style={{ borderColor: 'var(--color-acero-claro)' }}
        >
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>Filtros</span>
            <button onClick={() => setFiltersOpen(false)} aria-label="Cerrar filtros">
              <X size={14} style={{ color: 'var(--color-acero-oscuro)' }} />
            </button>
          </div>
          {panelFiltros}
        </div>
      )}

      {/* Desktop: sidebar + grid */}
      <div className="md:flex md:gap-12">
        <aside className="hidden md:block flex-shrink-0 w-52">
          {/* max-h + overflow: si el panel es más alto que el viewport, scrollea adentro
              en vez de quedar clavado hasta el final de la página */}
          <div className="sticky top-28 max-h-[calc(100vh-9rem)] overflow-y-auto pr-1">
            <div className="flex items-center justify-between mb-5">
              <span className="text-xs font-medium tracking-wide" style={{ color: 'var(--foreground)' }}>
                Filtros
              </span>
              {hayFiltros && (
                <button
                  onClick={limpiarFiltros}
                  className="text-[10px] underline"
                  style={{ color: 'var(--color-acero-oscuro)' }}
                >
                  Limpiar
                </button>
              )}
            </div>
            {panelFiltros}
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <p className="hidden md:block text-sm mb-6" style={{ color: 'var(--color-acero-oscuro)' }}>
            {resultado.length} producto{resultado.length !== 1 ? 's' : ''}
          </p>
          {resultado.length > 0 ? (
            <ProductGridPublic
              productos={resultado}
              nombreCategoria={nombreCategoria}
              mostrarPrecios={mostrarPrecios}
              estaLogueado={estaLogueado}
              esMayorista={esMayorista}
              aplicaIva={aplicaIva}
            />
          ) : (
            <div className="py-20 text-center">
              <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
                No hay productos para los filtros seleccionados.
              </p>
              <button
                onClick={limpiarFiltros}
                className="text-xs underline mt-3"
                style={{ color: 'var(--color-granito)' }}
              >
                Ver todos
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
