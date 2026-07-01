'use client'

import { useState, useTransition, useMemo, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { toggleProductoCanal, asignarCanalMasivo, actualizarMultiplo, actualizarDescuentoVolumen } from '@/app/actions/canales'
import { Search, Loader2, ChevronRight, ChevronDown } from 'lucide-react'

interface Producto { id: number; codigo_interno: string; titulo: string; categoria: string | null }
interface Canal    { id: number; slug: string; nombre: string }

const COLORES_CANAL: Record<string, string> = {
  consumidor_final: '#6366f1',
  distribuidor:     '#0ea5e9',
  local:            '#10b981',
  mercha:           '#f59e0b',
  fabricantes:      '#f97316',
  publico:          '#8b5cf6',
}

type EstadoCat = 'all' | 'some' | 'none'

function estadoCategoria(prods: Producto[], canalId: number, asignaciones: Set<string>): EstadoCat {
  const asignados = prods.filter(p => asignaciones.has(`${p.id}-${canalId}`)).length
  if (asignados === 0) return 'none'
  if (asignados === prods.length) return 'all'
  return 'some'
}

export function CanalesClient({
  productos,
  canales,
  asignacionesIniciales,
  multiplosIniciales,
  descuentosVolumenIniciales,
  categorias: _categorias,
}: {
  productos: Producto[]
  canales: Canal[]
  asignacionesIniciales: Set<string>
  multiplosIniciales: Record<string, number>  // key: `${producto_id}-${canal_id}`
  descuentosVolumenIniciales: Record<string, { cantidadMinima: number; pct: number }>
  categorias: string[]
}) {
  const router = useRouter()
  const [asignaciones, setAsignaciones] = useState<Set<string>>(new Set(asignacionesIniciales))
  const [multiplos, setMultiplos] = useState<Record<string, number>>(multiplosIniciales)
  const [editandoMultiplo, setEditandoMultiplo] = useState<string | null>(null)
  const [multiplosTemp, setMultiplosTemp] = useState<Record<string, string>>({})
  const [guardandoMultiplo, setGuardandoMultiplo] = useState<string | null>(null)
  const [descuentosVolumen, setDescuentosVolumen] = useState<Record<string, { cantidadMinima: number; pct: number }>>(descuentosVolumenIniciales)
  const [editandoDescVolumen, setEditandoDescVolumen] = useState<string | null>(null)
  const [descVolumenTemp, setDescVolumenTemp] = useState<Record<string, { cantidadMinima: string; pct: string }>>({})
  const [guardandoDescVolumen, setGuardandoDescVolumen] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [guardando, setGuardando] = useState<string | null>(null)
  const [guardandoCat, setGuardandoCat] = useState<string | null>(null)
  const [confirmandoCat, setConfirmandoCat] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set())

  const productosFiltrados = useMemo(() => {
    if (!busqueda) return productos
    const q = busqueda.toLowerCase()
    return productos.filter(p =>
      p.titulo.toLowerCase().includes(q) ||
      p.codigo_interno.toLowerCase().includes(q)
    )
  }, [productos, busqueda])

  const porCategoria = useMemo(() => {
    const grupos: Record<string, Producto[]> = {}
    for (const p of productosFiltrados) {
      const cat = p.categoria ?? 'Sin categoría'
      if (!grupos[cat]) grupos[cat] = []
      grupos[cat].push(p)
    }
    return grupos
  }, [productosFiltrados])

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

  function toggle(productoId: number, canalId: number) {
    const key = `${productoId}-${canalId}`
    const nuevoValor = !asignaciones.has(key)
    setGuardando(key)
    const anterior = new Set(asignaciones)
    const nuevo = new Set(asignaciones)
    nuevoValor ? nuevo.add(key) : nuevo.delete(key)
    setAsignaciones(nuevo)
    startTransition(async () => {
      try {
        const res = await toggleProductoCanal(productoId, canalId, nuevoValor)
        if (!res.ok) setAsignaciones(anterior)
        else router.refresh()
      } catch { setAsignaciones(anterior) }
      finally { setGuardando(null) }
    })
  }

  function toggleCategoria(cat: string, canalId: number, e: React.MouseEvent) {
    e.stopPropagation()
    const prods = porCategoria[cat] ?? []
    const estado = estadoCategoria(prods, canalId, asignaciones)
    // Si todos asignados → quitar todos. Si alguno o ninguno → asignar todos.
    const nuevoValor = estado !== 'all'
    const catKey = `cat-${cat}-${canalId}`
    setGuardandoCat(catKey)
    const anterior = new Set(asignaciones)
    const nuevo = new Set(asignaciones)
    prods.forEach(p => {
      const key = `${p.id}-${canalId}`
      nuevoValor ? nuevo.add(key) : nuevo.delete(key)
    })
    setAsignaciones(nuevo)
    startTransition(async () => {
      try {
        const res = await asignarCanalMasivo(prods.map(p => p.id), canalId, nuevoValor)
        if (!res.ok) setAsignaciones(anterior)
        else router.refresh()
      } catch { setAsignaciones(anterior) }
      finally { setGuardandoCat(null) }
    })
  }

  function confirmarMultiplo(productoId: number, canalId: number) {
    const key = `${productoId}-${canalId}`
    const raw = multiplosTemp[key] ?? ''
    const valor = Math.max(1, parseInt(raw) || 1)
    setEditandoMultiplo(null)
    if (valor === (multiplos[key] ?? 1)) return
    setGuardandoMultiplo(key)
    setMultiplos(prev => ({ ...prev, [key]: valor }))
    startTransition(async () => {
      try {
        await actualizarMultiplo(productoId, canalId, valor)
      } catch {
        setMultiplos(prev => ({ ...prev, [key]: multiplosIniciales[key] ?? 1 }))
      } finally { setGuardandoMultiplo(null) }
    })
  }

  function confirmarDescuentoVolumen(productoId: number, canalId: number) {
    const key = `${productoId}-${canalId}`
    const temp = descVolumenTemp[key]
    setEditandoDescVolumen(null)
    if (!temp) return

    const cantidadRaw = temp.cantidadMinima.trim()
    const pctRaw = temp.pct.trim()

    // Ambos vacíos = borrar el descuento configurado
    if (!cantidadRaw && !pctRaw) {
      if (!descuentosVolumen[key]) return
      setGuardandoDescVolumen(key)
      setDescuentosVolumen(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      startTransition(async () => {
        try {
          await actualizarDescuentoVolumen(productoId, canalId, null, null)
        } catch {
          setDescuentosVolumen(prev => ({ ...prev, ...(descuentosVolumenIniciales[key] ? { [key]: descuentosVolumenIniciales[key] } : {}) }))
        } finally { setGuardandoDescVolumen(null) }
      })
      return
    }

    const cantidadMinima = Math.max(1, parseInt(cantidadRaw) || 1)
    const pct = Math.min(100, Math.max(0.01, parseFloat(pctRaw) || 0))
    const anterior = descuentosVolumen[key]
    if (anterior && anterior.cantidadMinima === cantidadMinima && anterior.pct === pct) return

    setGuardandoDescVolumen(key)
    setDescuentosVolumen(prev => ({ ...prev, [key]: { cantidadMinima, pct } }))
    startTransition(async () => {
      try {
        await actualizarDescuentoVolumen(productoId, canalId, cantidadMinima, pct)
      } catch {
        setDescuentosVolumen(prev => {
          const next = { ...prev }
          if (anterior) next[key] = anterior
          else delete next[key]
          return next
        })
      } finally { setGuardandoDescVolumen(null) }
    })
  }

  return (
    <div>
      {/* Filtros */}
      <div className="flex gap-3 mb-6 items-center">
        <div className="relative max-w-xs flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-acero)' }} />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar producto o código…"
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border outline-none"
            style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
          />
        </div>
        <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
          {productosFiltrados.length} productos · {categoriasList.length} categorías
        </span>
        {isPending && <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-acero-oscuro)' }} />}
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-4 mb-4 text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex w-4 h-4 rounded border-2 items-center justify-center text-white text-xs" style={{ background: '#10b981', borderColor: '#10b981' }}>✓</span>
          Todos asignados
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex w-4 h-4 rounded border-2 items-center justify-center text-xs font-bold" style={{ background: '#10b98133', borderColor: '#10b981', color: '#10b981' }}>—</span>
          Parcialmente asignados
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex w-4 h-4 rounded border-2" style={{ borderColor: 'var(--color-acero-claro)' }} />
          Sin asignar
        </span>
        <span className="ml-auto opacity-60">Hacé clic en una categoría para expandirla</span>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-acero-claro)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--color-granito-oscuro)' }}>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)', width: '45%' }}>
                  Categoría / Producto
                </th>
                {canales.map(canal => (
                  <th key={canal.id} className="px-4 py-3 text-center font-medium" style={{ color: 'var(--color-acero-claro)' }}>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{ background: COLORES_CANAL[canal.slug] + '33', color: COLORES_CANAL[canal.slug] }}
                    >
                      {canal.nombre}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categoriasList.map(cat => {
                const prods = porCategoria[cat]
                const isExpanded = catExpandidas.has(cat)

                return (
                  <Fragment key={cat}>
                    {/* Fila de categoría */}
                    <tr
                      className="cursor-pointer transition-colors"
                      style={{
                        background: 'var(--color-acero-brillo)',
                        borderTop: '2px solid var(--color-acero-claro)',
                      }}
                      onClick={() => { setConfirmandoCat(null); toggleExpand(cat) }}
                    >
                      <td className="px-4 py-3">
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
                        </div>
                      </td>

                      {canales.map(canal => {
                        const catKey = `cat-${cat}-${canal.id}`
                        const estado: EstadoCat = estadoCategoria(prods, canal.id, asignaciones)
                        const cargando = guardandoCat === catKey
                        const confirmando = confirmandoCat === catKey
                        const color = COLORES_CANAL[canal.slug]
                        const accion = estado === 'all' ? 'Quitar' : 'Asignar'
                        return (
                          <td key={canal.id} className="px-4 py-3 text-center">
                            <div className="relative inline-block">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (confirmando) {
                                    setConfirmandoCat(null)
                                    return
                                  }
                                  setConfirmandoCat(catKey)
                                }}
                                disabled={cargando}
                                title={`${accion} todos de ${canal.nombre}`}
                                className="w-6 h-6 rounded border-2 inline-flex items-center justify-center transition-all duration-150 disabled:opacity-50 mx-auto"
                                style={{
                                  borderColor: confirmando ? color : estado === 'none' ? 'var(--color-acero-claro)' : color,
                                  background: confirmando ? color + '33' : estado === 'all' ? color : estado === 'some' ? color + '33' : 'transparent',
                                  outline: confirmando ? `2px solid ${color}` : 'none',
                                  outlineOffset: '2px',
                                }}
                              >
                                {cargando ? (
                                  <Loader2 size={10} className="animate-spin" style={{ color: estado === 'all' ? 'white' : color }} />
                                ) : estado === 'all' ? (
                                  <span className="text-white text-xs leading-none">✓</span>
                                ) : estado === 'some' ? (
                                  <span className="text-xs leading-none font-bold" style={{ color }}>—</span>
                                ) : null}
                              </button>

                              {/* Popover de confirmación */}
                              {confirmando && (
                                <div
                                  className="absolute z-20 top-8 left-1/2 -translate-x-1/2 rounded-lg shadow-lg border p-2 text-xs whitespace-nowrap"
                                  style={{ background: 'white', borderColor: 'var(--color-acero-claro)', minWidth: '140px' }}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <p className="mb-1.5 font-medium text-center" style={{ color: 'var(--foreground)' }}>
                                    {accion} {prods.length} productos
                                  </p>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={(e) => { setConfirmandoCat(null); toggleCategoria(cat, canal.id, e) }}
                                      className="flex-1 py-1 rounded font-medium text-white text-center"
                                      style={{ background: color }}
                                    >
                                      Confirmar
                                    </button>
                                    <button
                                      onClick={() => setConfirmandoCat(null)}
                                      className="flex-1 py-1 rounded text-center"
                                      style={{ background: 'var(--color-acero-brillo)', color: 'var(--color-acero-oscuro)' }}
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>

                    {/* Productos individuales (expandido) */}
                    {isExpanded && prods.map((p, i) => (
                      <tr
                        key={p.id}
                        style={{
                          background: i % 2 === 0 ? 'white' : '#f9fafb',
                          borderBottom: '1px solid var(--color-acero-claro)',
                        }}
                      >
                        <td className="py-2 pr-4 pl-10">
                          <span className="font-mono text-xs mr-2" style={{ color: 'var(--color-acero-oscuro)' }}>
                            {p.codigo_interno}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--foreground)' }}>{p.titulo}</span>
                        </td>
                        {canales.map(canal => {
                          const key = `${p.id}-${canal.id}`
                          const activo = asignaciones.has(key)
                          const cargando = guardando === key
                          const color = COLORES_CANAL[canal.slug]
                          const multiplo = multiplos[key] ?? 1
                          const editando = editandoMultiplo === key
                          const guardandoM = guardandoMultiplo === key
                          const descVolumen = descuentosVolumen[key]
                          const editandoDV = editandoDescVolumen === key
                          const guardandoDV = guardandoDescVolumen === key
                          return (
                            <td key={canal.id} className="px-4 py-2 text-center">
                              <div className="inline-flex flex-col items-center gap-0.5">
                                {/* Checkbox asignación */}
                                <button
                                  onClick={() => toggle(p.id, canal.id)}
                                  disabled={cargando}
                                  className="w-5 h-5 rounded border-2 inline-flex items-center justify-center transition-all duration-150 disabled:opacity-50"
                                  style={{
                                    borderColor: activo ? color : 'var(--color-acero-claro)',
                                    background: activo ? color : 'transparent',
                                  }}
                                >
                                  {cargando
                                    ? <Loader2 size={9} className="animate-spin" style={{ color: activo ? 'white' : color }} />
                                    : activo && <span className="text-white text-xs leading-none">✓</span>
                                  }
                                </button>

                                {/* Badge ×N (solo si está asignado) */}
                                {activo && (
                                  editando ? (
                                    <input
                                      type="number"
                                      min={1}
                                      autoFocus
                                      value={multiplosTemp[key] ?? String(multiplo)}
                                      onChange={e => setMultiplosTemp(prev => ({ ...prev, [key]: e.target.value }))}
                                      onBlur={() => confirmarMultiplo(p.id, canal.id)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') confirmarMultiplo(p.id, canal.id)
                                        if (e.key === 'Escape') setEditandoMultiplo(null)
                                      }}
                                      className="w-12 text-center text-xs rounded border px-1 py-0.5 outline-none"
                                      style={{ borderColor: color, color: 'var(--foreground)' }}
                                    />
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setEditandoMultiplo(key)
                                        setMultiplosTemp(prev => ({ ...prev, [key]: String(multiplo) }))
                                      }}
                                      title="Editar múltiplo de cantidad"
                                      className="text-xs px-1.5 py-0.5 rounded-full font-medium transition-opacity hover:opacity-70"
                                      style={{ background: color + '22', color }}
                                    >
                                      {guardandoM ? <Loader2 size={9} className="animate-spin inline" /> : `×${multiplo}`}
                                    </button>
                                  )
                                )}

                                {/* Descuento por volumen (solo si está asignado) */}
                                {activo && (
                                  editandoDV ? (
                                    <div className="flex items-center gap-0.5">
                                      <input
                                        type="number"
                                        min={1}
                                        autoFocus
                                        placeholder="cant."
                                        value={descVolumenTemp[key]?.cantidadMinima ?? String(descVolumen?.cantidadMinima ?? '')}
                                        onChange={e => setDescVolumenTemp(prev => ({ ...prev, [key]: { cantidadMinima: e.target.value, pct: prev[key]?.pct ?? String(descVolumen?.pct ?? '') } }))}
                                        onBlur={() => confirmarDescuentoVolumen(p.id, canal.id)}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') confirmarDescuentoVolumen(p.id, canal.id)
                                          if (e.key === 'Escape') setEditandoDescVolumen(null)
                                        }}
                                        className="w-11 text-center text-xs rounded border px-1 py-0.5 outline-none"
                                        style={{ borderColor: color, color: 'var(--foreground)' }}
                                      />
                                      <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>u →</span>
                                      <input
                                        type="number"
                                        min={0.01}
                                        max={100}
                                        step={0.01}
                                        placeholder="%"
                                        value={descVolumenTemp[key]?.pct ?? String(descVolumen?.pct ?? '')}
                                        onChange={e => setDescVolumenTemp(prev => ({ ...prev, [key]: { cantidadMinima: prev[key]?.cantidadMinima ?? String(descVolumen?.cantidadMinima ?? ''), pct: e.target.value } }))}
                                        onBlur={() => confirmarDescuentoVolumen(p.id, canal.id)}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') confirmarDescuentoVolumen(p.id, canal.id)
                                          if (e.key === 'Escape') setEditandoDescVolumen(null)
                                        }}
                                        className="w-11 text-center text-xs rounded border px-1 py-0.5 outline-none"
                                        style={{ borderColor: color, color: 'var(--foreground)' }}
                                      />
                                      <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>%</span>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setEditandoDescVolumen(key)
                                        setDescVolumenTemp(prev => ({
                                          ...prev,
                                          [key]: {
                                            cantidadMinima: descVolumen ? String(descVolumen.cantidadMinima) : '',
                                            pct: descVolumen ? String(descVolumen.pct) : '',
                                          },
                                        }))
                                      }}
                                      title="Editar descuento por volumen"
                                      className="text-xs px-1.5 py-0.5 rounded-full font-medium transition-opacity hover:opacity-70"
                                      style={descVolumen
                                        ? { background: '#10b98122', color: '#10b981' }
                                        : { color: 'var(--color-acero-claro)' }
                                      }
                                    >
                                      {guardandoDV
                                        ? <Loader2 size={9} className="animate-spin inline" />
                                        : descVolumen
                                          ? `-${descVolumen.pct}% ×${descVolumen.cantidadMinima}+`
                                          : '+ desc. volumen'
                                      }
                                    </button>
                                  )
                                )}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </Fragment>
                )
              })}

              {categoriasList.length === 0 && (
                <tr>
                  <td colSpan={canales.length + 1} className="px-4 py-12 text-center text-base" style={{ color: 'var(--color-acero-oscuro)' }}>
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
