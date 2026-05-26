'use client'

import { useState, useMemo, Fragment, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronRight, ChevronDown, AlertTriangle, Loader2 } from 'lucide-react'
import { toggleOferta, toggleDestacada, toggleNovedad } from '@/app/actions/ofertas'

interface Producto {
  id: number
  codigo_interno: string
  titulo: string
  categoria: string | null
  stock: number | null
  precio_lista1: number | null
  precio_lista2: number | null
  precio_lista3: number | null
  activo: boolean
}

const TAGS = [
  { key: 'ofertas' as const, label: 'Oferta',        color: '#f59e0b' },
  { key: 'hotsale' as const, label: 'Hot Sale',       color: '#ef4444' },
  { key: 'elegidos' as const, label: 'Más elegidos',  color: '#8b5cf6' },
  { key: 'novedad' as const, label: 'Novedad',        color: '#0ea5e9' },
]

function fmt(v: number | null) {
  return v ? `u$s ${v.toFixed(2)}` : '—'
}

export function ProductosListaClient({
  productos,
  ofertasIniciales,
  destacadasIniciales,
  novedadesIniciales,
}: {
  productos: Producto[]
  ofertasIniciales: Set<string>   // `${canal}-${producto_id}`
  destacadasIniciales: Set<number>
  novedadesIniciales: Set<number>
}) {
  const router = useRouter()
  const [busqueda, setBusqueda] = useState('')
  const [ocultarSinActivos, setOcultarSinActivos] = useState(true)
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set())
  const [ofertas, setOfertas] = useState<Set<string>>(new Set(ofertasIniciales))
  const [destacadas, setDestacadas] = useState<Set<number>>(new Set(destacadasIniciales))
  const [novedades, setNovedades] = useState<Set<number>>(new Set(novedadesIniciales))
  const [guardando, setGuardando] = useState<string | null>(null)
  const [guardandoDestacada, setGuardandoDestacada] = useState<number | null>(null)
  const [guardandoNovedad, setGuardandoNovedad] = useState<number | null>(null)
  const [, startTransition] = useTransition()

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
    if (ocultarSinActivos) {
      for (const cat of Object.keys(grupos)) {
        if (grupos[cat].every(p => !p.activo)) delete grupos[cat]
      }
    }
    return grupos
  }, [filtrados, ocultarSinActivos])

  const categoriasList = Object.keys(porCategoria).sort()
  const catExpandidas = busqueda ? new Set(categoriasList) : expandidas

  function toggleExpand(cat: string) {
    if (busqueda) return
    setExpandidas(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  function handleToggleDestacada(p: Producto) {
    const nuevoValor = !destacadas.has(p.id)
    setGuardandoDestacada(p.id)
    const anterior = new Set(destacadas)
    const nuevo = new Set(destacadas)
    nuevoValor ? nuevo.add(p.id) : nuevo.delete(p.id)
    setDestacadas(nuevo)
    startTransition(async () => {
      try {
        const res = await toggleDestacada(p.id, nuevoValor)
        if (!res.ok) setDestacadas(anterior)
        else router.refresh()
      } catch { setDestacadas(anterior) }
      finally { setGuardandoDestacada(null) }
    })
  }

  function handleToggleNovedad(p: Producto) {
    const nuevoValor = !novedades.has(p.id)
    setGuardandoNovedad(p.id)
    const anterior = new Set(novedades)
    const nuevo = new Set(novedades)
    nuevoValor ? nuevo.add(p.id) : nuevo.delete(p.id)
    setNovedades(nuevo)
    startTransition(async () => {
      try {
        const res = await toggleNovedad(p.id, nuevoValor)
        if (!res.ok) setNovedades(anterior)
        else router.refresh()
      } catch { setNovedades(anterior) }
      finally { setGuardandoNovedad(null) }
    })
  }

  function handleToggleOferta(canal: 'ofertas' | 'hotsale', p: Producto) {
    const key = `${canal}-${p.id}`
    const nuevoValor = !ofertas.has(key)
    setGuardando(key)
    const anterior = new Set(ofertas)
    const nuevo = new Set(ofertas)
    nuevoValor ? nuevo.add(key) : nuevo.delete(key)
    setOfertas(nuevo)
    startTransition(async () => {
      try {
        const res = await toggleOferta(canal, p.id, p.precio_lista1, nuevoValor)
        if (!res.ok) setOfertas(anterior)
        else router.refresh()
      } catch { setOfertas(anterior) }
      finally { setGuardando(null) }
    })
  }

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
        <label className="flex items-center gap-2 cursor-pointer select-none text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
          <input
            type="checkbox"
            checked={ocultarSinActivos}
            onChange={e => setOcultarSinActivos(e.target.checked)}
            className="w-4 h-4 rounded accent-granito cursor-pointer"
          />
          Ocultar categorías sin activos
        </label>
        <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
          {filtrados.length} productos · {categoriasList.length} categorías
        </span>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-acero-claro)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--color-granito-oscuro)', borderBottom: '1px solid var(--color-acero-claro)' }}>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)', width: '35%' }}>
                  Categoría / Producto
                </th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Código</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Stock</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Lista 1</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Lista 2</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Lista 3</th>
                <th className="text-center px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Estado</th>
                {TAGS.map(t => (
                  <th key={t.key} className="px-3 py-3 text-center font-medium" style={{ color: 'var(--color-acero-claro)' }}>
                    <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: t.color + '33', color: t.color }}>
                      {t.label}
                    </span>
                  </th>
                ))}
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
                      style={{ background: 'var(--color-acero-brillo)', borderTop: '2px solid var(--color-acero-claro)' }}
                      onClick={() => toggleExpand(cat)}
                    >
                      <td className="px-4 py-3" colSpan={2}>
                        <div className="flex items-center gap-2">
                          {isExpanded
                            ? <ChevronDown size={14} style={{ color: 'var(--color-acero-oscuro)', flexShrink: 0 }} />
                            : <ChevronRight size={14} style={{ color: 'var(--color-acero-oscuro)', flexShrink: 0 }} />
                          }
                          <span className="font-medium text-sm" style={{ color: 'var(--color-granito-claro)' }}>{cat}</span>
                          <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>({prods.length} productos)</span>
                          {sinStock > 0 && (
                            <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#fee2e2', color: '#dc2626' }}>
                              <AlertTriangle size={10} />{sinStock} sin stock
                            </span>
                          )}
                          {inactivos > 0 && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#f3f4f6', color: '#6b7280' }}>
                              {inactivos} inactivos
                            </span>
                          )}
                        </div>
                      </td>
                      <td /><td /><td /><td /><td /><td /><td /><td /><td />
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
                        {TAGS.map(t => {
                          if (t.key === 'elegidos') {
                            const activo = destacadas.has(p.id)
                            const cargando = guardandoDestacada === p.id
                            return (
                              <td key={t.key} className="px-3 py-2.5 text-center">
                                <button
                                  onClick={() => handleToggleDestacada(p)}
                                  disabled={cargando || !p.activo}
                                  title={activo ? 'Quitar de Más elegidos' : 'Agregar a Más elegidos'}
                                  className="w-5 h-5 rounded border-2 inline-flex items-center justify-center transition-all duration-150 disabled:opacity-40"
                                  style={{
                                    borderColor: activo ? t.color : 'var(--color-acero-claro)',
                                    background: activo ? t.color : 'transparent',
                                  }}
                                >
                                  {cargando
                                    ? <Loader2 size={9} className="animate-spin" style={{ color: activo ? 'white' : t.color }} />
                                    : activo && <span className="text-white text-[10px] leading-none">✓</span>
                                  }
                                </button>
                              </td>
                            )
                          }
                          if (t.key === 'novedad') {
                            const activo = novedades.has(p.id)
                            const cargando = guardandoNovedad === p.id
                            return (
                              <td key={t.key} className="px-3 py-2.5 text-center">
                                <button
                                  onClick={() => handleToggleNovedad(p)}
                                  disabled={cargando || !p.activo}
                                  title={activo ? 'Quitar de Novedades' : 'Agregar a Novedades'}
                                  className="w-5 h-5 rounded border-2 inline-flex items-center justify-center transition-all duration-150 disabled:opacity-40"
                                  style={{
                                    borderColor: activo ? t.color : 'var(--color-acero-claro)',
                                    background: activo ? t.color : 'transparent',
                                  }}
                                >
                                  {cargando
                                    ? <Loader2 size={9} className="animate-spin" style={{ color: activo ? 'white' : t.color }} />
                                    : activo && <span className="text-white text-[10px] leading-none">✓</span>
                                  }
                                </button>
                              </td>
                            )
                          }
                          const key = `${t.key}-${p.id}`
                          const activo = ofertas.has(key)
                          const cargando = guardando === key
                          return (
                            <td key={t.key} className="px-3 py-2.5 text-center">
                              <button
                                onClick={() => handleToggleOferta(t.key, p)}
                                disabled={cargando || !p.activo}
                                title={activo ? `Quitar de ${t.label}` : `Agregar a ${t.label}`}
                                className="w-5 h-5 rounded border-2 inline-flex items-center justify-center transition-all duration-150 disabled:opacity-40"
                                style={{
                                  borderColor: activo ? t.color : 'var(--color-acero-claro)',
                                  background: activo ? t.color : 'transparent',
                                }}
                              >
                                {cargando
                                  ? <Loader2 size={9} className="animate-spin" style={{ color: activo ? 'white' : t.color }} />
                                  : activo && <span className="text-white text-[10px] leading-none">✓</span>
                                }
                              </button>
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
                  <td colSpan={11} className="px-4 py-12 text-center text-base" style={{ color: 'var(--color-acero-oscuro)' }}>
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
