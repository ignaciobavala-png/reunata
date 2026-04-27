'use client'

import { useState, useTransition, useMemo, Fragment } from 'react'
import { toggleProductoCanal, asignarCanalMasivo } from '@/app/actions/canales'
import { Search, Loader2, CheckSquare, Square } from 'lucide-react'

interface Producto { id: number; codigo_interno: string; titulo: string; categoria: string | null }
interface Canal    { id: number; slug: string; nombre: string }

const COLORES_CANAL: Record<string, string> = {
  consumidor_final: '#6366f1',
  distribuidor:     '#0ea5e9',
  local:            '#10b981',
  mercha:           '#f59e0b',
  publico:          '#8b5cf6',
}

export function CanalesClient({
  productos,
  canales,
  asignacionesIniciales,
  categorias,
}: {
  productos: Producto[]
  canales: Canal[]
  asignacionesIniciales: Set<string>
  categorias: string[]
}) {
  const [asignaciones, setAsignaciones] = useState<Set<string>>(new Set(asignacionesIniciales))
  const [isPending, startTransition] = useTransition()
  const [guardando, setGuardando] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')

  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      const matchBusqueda = !busqueda ||
        p.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.codigo_interno.toLowerCase().includes(busqueda.toLowerCase())
      const matchCategoria = !categoriaFiltro || p.categoria === categoriaFiltro
      return matchBusqueda && matchCategoria
    })
  }, [productos, busqueda, categoriaFiltro])

  // Agrupar por categoría
  const porCategoria = useMemo(() => {
    const grupos: Record<string, Producto[]> = {}
    for (const p of productosFiltrados) {
      const cat = p.categoria ?? 'Sin categoría'
      if (!grupos[cat]) grupos[cat] = []
      grupos[cat].push(p)
    }
    return grupos
  }, [productosFiltrados])

  function isAsignado(productoId: number, canalId: number) {
    return asignaciones.has(`${productoId}-${canalId}`)
  }

  function toggle(productoId: number, canalId: number) {
    const key = `${productoId}-${canalId}`
    const nuevoValor = !asignaciones.has(key)
    setGuardando(key)

    const nuevo = new Set(asignaciones)
    if (nuevoValor) nuevo.add(key)
    else nuevo.delete(key)
    setAsignaciones(nuevo)

    startTransition(async () => {
      await toggleProductoCanal(productoId, canalId, nuevoValor)
      setGuardando(null)
    })
  }

  // Seleccionar/deseleccionar todos los productos filtrados para un canal
  function toggleTodosEnCanal(canalId: number) {
    const ids = productosFiltrados.map(p => p.id)
    const todosActivos = ids.every(id => asignaciones.has(`${id}-${canalId}`))
    const nuevoValor = !todosActivos

    const nuevo = new Set(asignaciones)
    ids.forEach(id => {
      const key = `${id}-${canalId}`
      if (nuevoValor) nuevo.add(key)
      else nuevo.delete(key)
    })
    setAsignaciones(nuevo)

    startTransition(() => asignarCanalMasivo(ids, canalId, nuevoValor))
  }

  const categoriasList = Object.keys(porCategoria).sort()

  return (
    <div>
      {/* Filtros */}
      <div className="flex gap-3 mb-6">
        <div className="relative max-w-xs flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-acero)' }} />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar producto…"
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border outline-none"
            style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
          />
        </div>
        <select
          value={categoriaFiltro}
          onChange={e => setCategoriaFiltro(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border outline-none"
          style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
        >
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-xs self-center" style={{ color: 'var(--color-acero-oscuro)' }}>
          {productosFiltrados.length} productos
        </span>
        {isPending && <Loader2 size={14} className="self-center animate-spin" style={{ color: 'var(--color-acero-oscuro)' }} />}
      </div>

      {/* Tabla */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-acero-claro)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--color-granito-oscuro)' }}>
                <th className="text-left px-4 py-3 font-medium w-[40%]" style={{ color: 'var(--color-acero-claro)' }}>
                  Producto
                </th>
                {canales.map(canal => (
                  <th key={canal.id} className="px-4 py-3 text-center font-medium" style={{ color: 'var(--color-acero-claro)' }}>
                    <div className="flex flex-col items-center gap-1.5">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs"
                        style={{ background: COLORES_CANAL[canal.slug] + '33', color: COLORES_CANAL[canal.slug] }}
                      >
                        {canal.nombre}
                      </span>
                      {/* Toggle todos */}
                      <button
                        onClick={() => toggleTodosEnCanal(canal.id)}
                        className="text-xs opacity-60 hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--color-acero)' }}
                        title="Activar/desactivar todos"
                      >
                        {productosFiltrados.every(p => asignaciones.has(`${p.id}-${canal.id}`))
                          ? <CheckSquare size={12} /> : <Square size={12} />}
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categoriasList.map(cat => (
                <Fragment key={cat}>
                  {/* Encabezado de categoría */}
                  <tr style={{ background: 'var(--color-acero-brillo)' }}>
                    <td
                      colSpan={canales.length + 1}
                      className="px-4 py-2 text-xs font-medium tracking-wide uppercase"
                      style={{ color: 'var(--color-granito-claro)' }}
                    >
                      {cat} ({porCategoria[cat].length})
                    </td>
                  </tr>

                  {/* Filas de productos */}
                  {porCategoria[cat].map((p, i) => (
                    <tr
                      key={p.id}
                      style={{
                        background: i % 2 === 0 ? 'white' : 'var(--color-acero-brillo)',
                        borderBottom: '1px solid var(--color-acero-claro)',
                      }}
                    >
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-xs mr-2" style={{ color: 'var(--color-acero-oscuro)' }}>
                          {p.codigo_interno}
                        </span>
                        <span style={{ color: 'var(--foreground)' }}>{p.titulo}</span>
                      </td>
                      {canales.map(canal => {
                        const key = `${p.id}-${canal.id}`
                        const activo = asignaciones.has(key)
                        const cargando = guardando === key
                        return (
                          <td key={canal.id} className="px-4 py-2.5 text-center">
                            <button
                              onClick={() => toggle(p.id, canal.id)}
                              disabled={cargando}
                              className="w-5 h-5 rounded border-2 inline-flex items-center justify-center transition-all duration-150 disabled:opacity-50"
                              style={{
                                borderColor: activo ? COLORES_CANAL[canal.slug] : 'var(--color-acero-claro)',
                                background: activo ? COLORES_CANAL[canal.slug] : 'transparent',
                              }}
                            >
                              {cargando
                                ? <Loader2 size={10} className="animate-spin text-white" />
                                : activo && <span className="text-white text-xs leading-none">✓</span>
                              }
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}

              {categoriasList.length === 0 && (
                <tr>
                  <td colSpan={canales.length + 1} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
                    No hay productos. Sincronizá primero desde el panel de Sync.
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
