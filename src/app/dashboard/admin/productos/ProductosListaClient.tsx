'use client'

import { useState, useMemo, Fragment } from 'react'
import { Search, ChevronRight, ChevronDown, AlertTriangle } from 'lucide-react'

interface Producto {
  id: number
  codigo_interno: string
  titulo: string
  categoria: string | null
  stock: number | null
  precio_lista1: number | null
  precio_lista2: number | null
  precio_lista3: number | null
  precio_compra: number | null
  activo: boolean
}

function fmt(v: number | null) {
  return v ? `u$s ${v.toFixed(2)}` : '—'
}

export function ProductosListaClient({ productos }: { productos: Producto[] }) {
  const [busqueda, setBusqueda] = useState('')
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set())

  const filtrados = useMemo(() => {
    if (!busqueda) return productos
    const q = busqueda.toLowerCase()
    return productos.filter(p =>
      p.titulo.toLowerCase().includes(q) ||
      (p.codigo_interno ?? '').toLowerCase().includes(q) ||
      (p.categoria ?? '').toLowerCase().includes(q)
    )
  }, [productos, busqueda])

  const porCategoria = useMemo(() => {
    const grupos: Record<string, Producto[]> = {}
    for (const p of filtrados) {
      const cat = p.categoria ?? 'Sin categoría'
      if (!grupos[cat]) grupos[cat] = []
      grupos[cat].push(p)
    }
    return grupos
  }, [filtrados])

  const categoriasList = Object.keys(porCategoria).sort()

  // Al buscar, todas las categorías se expanden automáticamente
  const catExpandidas = busqueda ? new Set(categoriasList) : expandidas

  function toggleExpand(cat: string) {
    if (busqueda) return
    setExpandidas(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  const totalFiltrados = filtrados.length

  return (
    <div>
      {/* Búsqueda */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative max-w-sm flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-acero)' }} />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por producto, código o categoría…"
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border outline-none"
            style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
          />
        </div>
        <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
          {totalFiltrados} productos · {categoriasList.length} categorías
        </span>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-acero-claro)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--color-granito-oscuro)', borderBottom: '1px solid var(--color-acero-claro)' }}>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)', width: '40%' }}>
                  Categoría / Producto
                </th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Código</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Stock</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Lista 1</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Lista 2</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Lista 3</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Costo</th>
                <th className="text-center px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {categoriasList.map(cat => {
                const prods = porCategoria[cat]
                const isExpanded = catExpandidas.has(cat)
                const sinStock = prods.filter(p => p.stock === 0).length
                const inactivos = prods.filter(p => !p.activo).length

                return (
                  <Fragment key={cat}>
                    {/* Fila de categoría */}
                    <tr
                      className="cursor-pointer transition-colors"
                      style={{
                        background: 'var(--color-acero-brillo)',
                        borderTop: '2px solid var(--color-acero-claro)',
                      }}
                      onClick={() => toggleExpand(cat)}
                    >
                      <td className="px-4 py-3" colSpan={2}>
                        <div className="flex items-center gap-2">
                          {isExpanded
                            ? <ChevronDown size={14} style={{ color: 'var(--color-acero-oscuro)', flexShrink: 0 }} />
                            : <ChevronRight size={14} style={{ color: 'var(--color-acero-oscuro)', flexShrink: 0 }} />
                          }
                          <span className="font-medium text-sm" style={{ color: 'var(--color-granito-claro)' }}>
                            {cat}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                            ({prods.length} productos)
                          </span>
                          {sinStock > 0 && (
                            <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#fee2e2', color: '#dc2626' }}>
                              <AlertTriangle size={10} />
                              {sinStock} sin stock
                            </span>
                          )}
                          {inactivos > 0 && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#f3f4f6', color: '#6b7280' }}>
                              {inactivos} inactivos
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Celdas vacías para mantener la estructura */}
                      <td /><td /><td /><td /><td /><td />
                    </tr>

                    {/* Productos individuales */}
                    {isExpanded && prods.map((p, i) => (
                      <tr
                        key={p.id}
                        style={{
                          background: i % 2 === 0 ? 'white' : '#f9fafb',
                          borderBottom: '1px solid var(--color-acero-claro)',
                          opacity: p.activo ? 1 : 0.55,
                        }}
                      >
                        <td className="py-2.5 pr-4 pl-10 max-w-[280px]" style={{ color: 'var(--foreground)' }}>
                          {p.titulo}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                          {p.codigo_interno ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right" style={{ color: p.stock === 0 ? '#ef4444' : 'var(--foreground)' }}>
                          {p.stock ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right" style={{ color: 'var(--foreground)' }}>{fmt(p.precio_lista1)}</td>
                        <td className="px-4 py-2.5 text-right" style={{ color: 'var(--foreground)' }}>{fmt(p.precio_lista2)}</td>
                        <td className="px-4 py-2.5 text-right" style={{ color: 'var(--foreground)' }}>{fmt(p.precio_lista3)}</td>
                        <td className="px-4 py-2.5 text-right" style={{ color: 'var(--color-acero-oscuro)' }}>{fmt(p.precio_compra)}</td>
                        <td className="px-4 py-2.5 text-center">
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
                  </Fragment>
                )
              })}

              {categoriasList.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-base" style={{ color: 'var(--color-acero-oscuro)' }}>
                    {busqueda ? `Sin resultados para "${busqueda}"` : 'No hay productos. Ejecutá una sincronización desde el panel de Sync.'}
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
