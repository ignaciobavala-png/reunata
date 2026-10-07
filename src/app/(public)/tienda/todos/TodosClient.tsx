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
  atributos?: { clave: string; valor: string }[] | null
  stock?: number | null
  created_at: string
  supabaseUrl: string
}

// Solo se ofrece como filtro un atributo que aparezca en al menos estos productos
// y con más de un valor distinto — evita facetas de un solo ítem que no filtran nada.
const MIN_PRODUCTOS_POR_ATRIBUTO = 2

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
      {/* Hasta 5 opciones visibles (una fila ≈ 1.5rem): si el grupo tiene más,
          scrollea adentro en vez de estirar el panel. `data-lenis-prevent` para
          que la rueda mueva este grupo y no los productos —Lenis intercepta el
          scroll de la página (tester 07/10). */}
      <div className="max-h-[7.5rem] overflow-y-auto -mr-1 pr-1" data-lenis-prevent>
        {children}
      </div>
    </div>
  )
}

export function TodosClient({
  productos,
  mostrarPrecios,
  esMayorista,
  estaLogueado,
  nombreCategoria = 'todos los productos',
}: {
  productos: ProductoTodos[]
  mostrarPrecios: boolean
  esMayorista: boolean
  estaLogueado: boolean
  nombreCategoria?: string
}) {
  const [categoriasSel, setCategoriasSel] = useState<Set<string>>(new Set())
  const [coloresSel, setColoresSel] = useState<Set<string>>(new Set())
  const [precioMin, setPrecioMin] = useState('')
  const [precioMax, setPrecioMax] = useState('')
  const [orden, setOrden] = useState<Orden>('relevancia')
  const [filtersOpen, setFiltersOpen] = useState(false)
  // Filtros por atributo técnico: clave → valores seleccionados
  const [atributosSel, setAtributosSel] = useState<Record<string, Set<string>>>({})

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

  // Facetas dinámicas a partir de la ficha técnica: por cada clave (Material,
  // Capacidad…), sus valores con conteo. Solo claves clasificatorias de verdad
  // (aparecen en varios productos y tienen más de un valor distinto).
  const facetasAtributos = useMemo(() => {
    const porClave = new Map<string, Map<string, number>>()
    productos.forEach(p => {
      // Un producto suma como máximo 1 al conteo de cada par clave/valor
      const vistos = new Set<string>()
      p.atributos?.forEach(({ clave, valor }) => {
        const par = `${clave}\u0000${valor}`
        if (vistos.has(par)) return
        vistos.add(par)
        if (!porClave.has(clave)) porClave.set(clave, new Map())
        const valores = porClave.get(clave)!
        valores.set(valor, (valores.get(valor) ?? 0) + 1)
      })
    })
    return [...porClave.entries()]
      .map(([clave, valores]) => ({
        clave,
        total: [...valores.values()].reduce((a, b) => a + b, 0),
        valores: [...valores.entries()].map(([valor, count]) => ({ valor, count })).sort((a, b) => a.valor.localeCompare(b.valor, 'es')),
      }))
      .filter(f => f.valores.length > 1 && f.total >= MIN_PRODUCTOS_POR_ATRIBUTO)
      .sort((a, b) => a.clave.localeCompare(b.clave, 'es'))
  }, [productos])

  const resultado = useMemo(() => {
    let list = [...productos]

    if (categoriasSel.size > 0)
      list = list.filter(p => categoriasSel.has(p.categoria))

    if (coloresSel.size > 0)
      list = list.filter(p => p.variantes?.some(v => coloresSel.has(v.nombre.toUpperCase())))

    // Atributos: por cada clave con valores elegidos, el producto debe tener uno
    const clavesActivas = Object.entries(atributosSel).filter(([, vals]) => vals.size > 0)
    if (clavesActivas.length > 0) {
      list = list.filter(p =>
        clavesActivas.every(([clave, vals]) =>
          p.atributos?.some(a => a.clave === clave && vals.has(a.valor))
        )
      )
    }

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
  }, [productos, categoriasSel, coloresSel, atributosSel, precioMin, precioMax, orden])

  const hayAtributosSel = Object.values(atributosSel).some(s => s.size > 0)
  const hayFiltros = categoriasSel.size > 0 || coloresSel.size > 0 || hayAtributosSel || !!precioMin || !!precioMax

  function toggleAtributo(clave: string, valor: string) {
    setAtributosSel(prev => {
      const actual = prev[clave] ?? new Set<string>()
      const next = new Set(actual)
      if (next.has(valor)) next.delete(valor)
      else next.add(valor)
      return { ...prev, [clave]: next }
    })
  }

  function limpiarFiltros() {
    setCategoriasSel(new Set())
    setColoresSel(new Set())
    setAtributosSel({})
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

      {/* Filtros por ficha técnica (Material, Capacidad, etc.) */}
      {facetasAtributos.map(faceta => (
        <FiltroSeccion key={faceta.clave} titulo={faceta.clave}>
          {faceta.valores.map(({ valor, count }) => (
            <label key={valor} className="flex items-center gap-2 py-1 cursor-pointer">
              <input
                type="checkbox"
                checked={atributosSel[faceta.clave]?.has(valor) ?? false}
                onChange={() => toggleAtributo(faceta.clave, valor)}
                className="accent-[var(--color-granito)]"
              />
              <span className="text-xs" style={{ color: 'var(--foreground)' }}>
                {valor} <span style={{ color: 'var(--color-acero-oscuro)' }}>({count})</span>
              </span>
            </label>
          ))}
        </FiltroSeccion>
      ))}

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
              en vez de quedar clavado hasta el final de la página. `data-lenis-prevent`
              para que la rueda mueva el panel y no los productos (tester 07/10). */}
          <div className="sticky top-28 max-h-[calc(100vh-9rem)] overflow-y-auto pr-1" data-lenis-prevent>
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
