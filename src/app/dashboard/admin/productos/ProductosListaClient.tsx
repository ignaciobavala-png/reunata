'use client'

import { useState, useMemo, Fragment, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronRight, ChevronDown, AlertTriangle, Loader2, Camera, Package, FileText, LayoutList, Grid3X3, Layers } from 'lucide-react'
import { formatPrecio } from '@/lib/utils'
import { toggleOferta, toggleDestacada, toggleNovedad } from '@/app/actions/ofertas'
import { asignarCanalMasivo } from '@/app/actions/canales'
import { ProductoFichaDrawer, type FotoItem, type Canal, type DimensionesEnvio } from '@/components/admin/ProductoFichaDrawer'
import { CanalesClient } from './CanalesClient'
import { CanalesListaClient } from '../canales/CanalesListaClient'

interface Producto {
  id: number
  codigo_interno: string
  titulo: string
  categoria: string | null
  descripcion: string | null
  stock: number | null
  precio_lista3: number | null
  precio_lista5: number | null
  activo: boolean
  alto: number | null
  ancho: number | null
  largo: number | null
  peso: number | null
  enviar_solo: boolean
}

const TAGS = [
  { key: 'ofertas' as const,   label: 'Oferta',       color: '#f59e0b' },
  { key: 'hotsale' as const,   label: 'Hot Sale',      color: '#ef4444' },
  { key: 'elegidos' as const,  label: 'Más elegidos',  color: '#8b5cf6' },
  { key: 'novedad' as const,   label: 'Novedad',       color: '#0ea5e9' },
]

const COLORES_CANAL: Record<string, string> = {
  consumidor_final: '#6366f1',
  distribuidor: '#0ea5e9',
  local: '#10b981',
  mercha: '#f59e0b',
}

function fmt(v: number | null) {
  return v ? formatPrecio(v) : '—'
}

export function ProductosListaClient({
  productos,
  ofertasIniciales,
  destacadasIniciales,
  novedadesIniciales,
  fotosIniciales,
  supabaseUrl,
  isMaster,
  canalesIniciales,
  asignacionesIniciales,
  multiplosIniciales,
  todosLosCanalesIniciales,
  configsIniciales,
}: {
  productos: Producto[]
  ofertasIniciales: Set<string>
  destacadasIniciales: Set<number>
  novedadesIniciales: Set<number>
  fotosIniciales: FotoItem[]
  supabaseUrl: string
  isMaster: boolean
  canalesIniciales: Canal[]
  asignacionesIniciales: Set<string>
  multiplosIniciales: Record<string, number>
  todosLosCanalesIniciales: { id: number; slug: string; nombre: string; activo: boolean }[]
  configsIniciales: Record<number, Record<string, unknown>>
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
  const [fotosMap, setFotosMap] = useState<Record<number, FotoItem[]>>(() => {
    const map: Record<number, FotoItem[]> = {}
    for (const f of fotosIniciales) {
      if (!map[f.producto_id]) map[f.producto_id] = []
      map[f.producto_id].push(f)
    }
    return map
  })
  const [asignaciones, setAsignaciones] = useState<Set<string>>(new Set(asignacionesIniciales))
  const [multiplos, setMultiplos] = useState<Record<string, number>>({ ...multiplosIniciales })
  const [drawerState, setDrawerState] = useState<{ producto: Producto; tab: 'fotos' | 'canales' | 'descripcion' | 'envio' } | null>(null)
  const [dimensiones, setDimensiones] = useState<Record<number, DimensionesEnvio>>(() => {
    const map: Record<number, DimensionesEnvio> = {}
    for (const p of productos) {
      map[p.id] = { alto: p.alto, ancho: p.ancho, largo: p.largo, peso: p.peso, enviar_solo: p.enviar_solo }
    }
    return map
  })
  const [vista, setVista] = useState<'lista' | 'asignaciones' | 'canales'>('lista')

  // Asignaciones masivas por categoría
  const [confirmandoCat, setConfirmandoCat] = useState<string | null>(null)
  const [guardandoCat, setGuardandoCat] = useState<string | null>(null)

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

  function estadoCategoria(prods: Producto[], canalId: number): 'all' | 'some' | 'none' {
    const n = prods.filter(p => asignaciones.has(`${p.id}-${canalId}`)).length
    if (n === 0) return 'none'
    if (n === prods.length) return 'all'
    return 'some'
  }

  function toggleExpand(cat: string) {
    if (busqueda) return
    setConfirmandoCat(null)
    setExpandidas(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  function handleClickCatCanal(e: React.MouseEvent, cat: string, canalId: number) {
    e.stopPropagation()
    const key = `${cat}-${canalId}`
    setConfirmandoCat(prev => prev === key ? null : key)
  }

  function toggleCategoria(cat: string, canalId: number) {
    const prods = porCategoria[cat] ?? []
    const nuevoValor = estadoCategoria(prods, canalId) !== 'all'
    const catKey = `${cat}-${canalId}`
    setConfirmandoCat(null)
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
        const res = await toggleOferta(canal, p.id, p.precio_lista3, nuevoValor)
        if (!res.ok) setOfertas(anterior)
        else router.refresh()
      } catch { setOfertas(anterior) }
      finally { setGuardando(null) }
    })
  }

  function handleCanalesChange(productoId: number, asignadosIds: Set<number>, nuevosMultiplos: Record<number, number>) {
    setAsignaciones(prev => {
      const nuevo = new Set(prev)
      for (const canal of canalesIniciales) {
        const key = `${productoId}-${canal.id}`
        if (asignadosIds.has(canal.id)) nuevo.add(key)
        else nuevo.delete(key)
      }
      return nuevo
    })
    setMultiplos(prev => {
      const nuevo = { ...prev }
      for (const [canalId, val] of Object.entries(nuevosMultiplos)) {
        nuevo[`${productoId}-${canalId}`] = val
      }
      return nuevo
    })
  }

  const drawerAsignaciones = useMemo<Set<number>>(() => {
    if (!drawerState) return new Set()
    const pid = drawerState.producto.id
    return new Set(canalesIniciales.filter(c => asignaciones.has(`${pid}-${c.id}`)).map(c => c.id))
  }, [drawerState, asignaciones, canalesIniciales])

  const drawerDimensiones = useMemo<DimensionesEnvio>(() => {
    if (!drawerState) return { alto: null, ancho: null, largo: null, peso: null, enviar_solo: false }
    return dimensiones[drawerState.producto.id] ?? { alto: null, ancho: null, largo: null, peso: null, enviar_solo: false }
  }, [drawerState, dimensiones])

  const drawerMultiplos = useMemo<Record<number, number>>(() => {
    if (!drawerState) return {}
    const pid = drawerState.producto.id
    const result: Record<number, number> = {}
    for (const canal of canalesIniciales) {
      result[canal.id] = multiplos[`${pid}-${canal.id}`] ?? 1
    }
    return result
  }, [drawerState, multiplos, canalesIniciales])

  return (
    <>
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-6">
        {/* Toggle de vista */}
        <div className="flex rounded-lg border overflow-hidden flex-shrink-0" style={{ borderColor: 'var(--color-acero-claro)' }}>
          <button
            onClick={() => setVista('lista')}
            className="flex items-center gap-1.5 px-3 py-2 text-sm transition-colors"
            style={{
              background: vista === 'lista' ? 'var(--color-granito-oscuro)' : 'white',
              color: vista === 'lista' ? 'white' : 'var(--color-acero-oscuro)',
            }}
          >
            <LayoutList size={14} />
            Lista
          </button>
          <button
            onClick={() => setVista('asignaciones')}
            className="flex items-center gap-1.5 px-3 py-2 text-sm transition-colors border-l"
            style={{
              borderColor: 'var(--color-acero-claro)',
              background: vista === 'asignaciones' ? 'var(--color-granito-oscuro)' : 'white',
              color: vista === 'asignaciones' ? 'white' : 'var(--color-acero-oscuro)',
            }}
          >
            <Grid3X3 size={14} />
            Asignaciones
          </button>
          <button
            onClick={() => setVista('canales')}
            className="flex items-center gap-1.5 px-3 py-2 text-sm transition-colors border-l"
            style={{
              borderColor: 'var(--color-acero-claro)',
              background: vista === 'canales' ? 'var(--color-granito-oscuro)' : 'white',
              color: vista === 'canales' ? 'white' : 'var(--color-acero-oscuro)',
            }}
          >
            <Layers size={14} />
            Canales
          </button>
        </div>

        {vista === 'lista' && (
          <>
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
          </>
        )}
      </div>

      {/* Vista Asignaciones */}
      {vista === 'asignaciones' && (
        <CanalesClient
          productos={productos.map(p => ({ id: p.id, codigo_interno: p.codigo_interno, titulo: p.titulo, categoria: p.categoria }))}
          canales={canalesIniciales}
          asignacionesIniciales={asignaciones}
          multiplosIniciales={multiplos}
          categorias={categoriasList}
        />
      )}

      {/* Vista Canales (configuración por canal) */}
      {vista === 'canales' && (
        <CanalesListaClient
          canales={todosLosCanalesIniciales}
          configsIniciales={configsIniciales}
        />
      )}

      {/* Vista Lista */}
      {vista === 'lista' && <div>

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
                <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>
                  <div className="flex flex-col items-end leading-tight">
                    <span>Stock</span>
                    <span className="text-xs font-normal opacity-60">Gesu / Visible</span>
                  </div>
                </th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Mayorista (L3)</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Minorista (L5)</th>
                <th className="text-center px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Estado</th>
                <th className="text-center px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Canales</th>
                <th className="text-center px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Fotos</th>
                <th className="text-center px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Envío</th>
                <th className="text-center px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Desc.</th>
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
                      {/* Nombre + badges */}
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

                      {/* Stock, L1, L2, L3, Estado — vacíos */}
                      <td /><td /><td /><td /><td />

                      {/* Canales — controles de asignación masiva */}
                      <td className="px-3 py-2 text-center" style={{ position: 'relative' }}>
                        <div className="inline-flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          {canalesIniciales.map(canal => {
                            const estado = estadoCategoria(prods, canal.id)
                            const color = COLORES_CANAL[canal.slug] ?? '#94a3b8'
                            const catKey = `${cat}-${canal.id}`
                            const cargando = guardandoCat === catKey
                            const confirmando = confirmandoCat === catKey

                            return (
                              <div key={canal.id} className="relative">
                                <button
                                  onClick={e => handleClickCatCanal(e, cat, canal.id)}
                                  disabled={cargando}
                                  title={`${canal.nombre}: ${estado === 'all' ? 'todos asignados' : estado === 'some' ? 'algunos asignados' : 'ninguno asignado'} — clic para asignar/quitar toda la categoría`}
                                  className="w-4 h-4 rounded-sm flex items-center justify-center transition-all disabled:opacity-40"
                                  style={{
                                    background: estado === 'all' ? color : estado === 'some' ? color + '44' : 'transparent',
                                    border: `2px solid ${estado === 'none' ? '#cbd5e1' : color}`,
                                  }}
                                >
                                  {cargando
                                    ? <Loader2 size={8} className="animate-spin" style={{ color: estado === 'none' ? '#cbd5e1' : color }} />
                                    : estado === 'all'
                                      ? <span className="text-white leading-none" style={{ fontSize: 9 }}>✓</span>
                                      : estado === 'some'
                                        ? <span className="leading-none font-bold" style={{ fontSize: 9, color }}>—</span>
                                        : null
                                  }
                                </button>

                                {/* Popover de confirmación */}
                                {confirmando && (
                                  <div
                                    className="absolute top-full mt-1 z-30 bg-white rounded-lg shadow-xl border p-2.5 text-left"
                                    style={{
                                      borderColor: color,
                                      borderWidth: 1.5,
                                      left: '50%',
                                      transform: 'translateX(-50%)',
                                      minWidth: 140,
                                    }}
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <p className="text-xs font-medium mb-2 leading-snug" style={{ color: 'var(--foreground)' }}>
                                      {estado === 'all' ? 'Quitar' : 'Asignar'}{' '}
                                      <span style={{ color }}>{canal.nombre}</span>
                                      {' '}a {prods.length} productos
                                    </p>
                                    <div className="flex gap-1.5">
                                      <button
                                        onClick={() => toggleCategoria(cat, canal.id)}
                                        className="flex-1 py-1 rounded text-xs font-medium text-white"
                                        style={{ background: color }}
                                      >
                                        Confirmar
                                      </button>
                                      <button
                                        onClick={() => setConfirmandoCat(null)}
                                        className="flex-1 py-1 rounded text-xs font-medium"
                                        style={{ color: 'var(--color-acero-oscuro)', background: 'var(--color-acero-brillo)' }}
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </td>

                      {/* Fotos + Envío + Desc + Tags — vacíos */}
                      <td /><td /><td /><td /><td /><td /><td />
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
                        <td className="px-4 py-2.5 text-right" style={{ color: p.stock === 0 ? '#ef4444' : 'var(--color-acero-oscuro)' }}>
                          {p.stock ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right" style={{ color: 'var(--foreground)' }}>{fmt(p.precio_lista3)}</td>
                        <td className="px-4 py-2.5 text-right" style={{ color: 'var(--foreground)' }}>{fmt(p.precio_lista5)}</td>
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

                        {/* Canales — puntos de colores por producto */}
                        <td className="px-4 py-2.5 text-center">
                          <button
                            onClick={() => setDrawerState({ producto: p, tab: 'canales' })}
                            className="inline-flex items-center gap-1 p-1 rounded hover:bg-gray-100 transition-colors"
                            title="Gestionar canales de venta"
                          >
                            {canalesIniciales.map(canal => {
                              const asignado = asignaciones.has(`${p.id}-${canal.id}`)
                              const color = COLORES_CANAL[canal.slug] ?? '#94a3b8'
                              return (
                                <span
                                  key={canal.id}
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{
                                    background: asignado ? color : 'transparent',
                                    border: `2px solid ${asignado ? color : '#cbd5e1'}`,
                                  }}
                                  title={canal.nombre}
                                />
                              )
                            })}
                          </button>
                        </td>

                        {/* Fotos */}
                        <td className="px-4 py-2.5 text-center">
                          {(() => {
                            const count = fotosMap[p.id]?.length ?? 0
                            return (
                              <button
                                onClick={() => setDrawerState({ producto: p, tab: 'fotos' })}
                                title="Gestionar fotos"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors"
                                style={{
                                  background: count > 0 ? '#dcfce7' : '#fee2e2',
                                  color: count > 0 ? '#16a34a' : '#dc2626',
                                }}
                              >
                                <Camera size={10} />
                                {count}
                              </button>
                            )
                          })()}
                        </td>

                        {/* Envío */}
                        <td className="px-4 py-2.5 text-center">
                          {(() => {
                            const d = dimensiones[p.id]
                            const completo = !!(d?.alto && d?.ancho && d?.largo && d?.peso)
                            return (
                              <button
                                onClick={() => setDrawerState({ producto: p, tab: 'envio' })}
                                title={completo ? 'Dimensiones cargadas' : 'Faltan dimensiones de envío'}
                                className="inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors"
                                style={{
                                  background: completo ? '#dcfce7' : '#fee2e2',
                                  color: completo ? '#16a34a' : '#dc2626',
                                }}
                              >
                                <Package size={11} />
                              </button>
                            )
                          })()}
                        </td>

                        {/* Descripción */}
                        <td className="px-4 py-2.5 text-center">
                          <button
                            onClick={() => setDrawerState({ producto: p, tab: 'descripcion' })}
                            title={p.descripcion ? 'Editar descripción' : 'Sin descripción — click para agregar'}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors"
                            style={{
                              background: p.descripcion ? '#dcfce7' : '#fee2e2',
                              color: p.descripcion ? '#16a34a' : '#dc2626',
                            }}
                          >
                            <FileText size={11} />
                          </button>
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
                  <td colSpan={13} className="px-4 py-12 text-center text-base" style={{ color: 'var(--color-acero-oscuro)' }}>
                    {busqueda ? `Sin resultados para "${busqueda}"` : 'No hay productos. Ejecutá una sincronización desde el panel de Sync.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>}
    </div>

      {drawerState && (
        <ProductoFichaDrawer
          key={drawerState.producto.id}
          producto={drawerState.producto}
          fotosIniciales={fotosMap[drawerState.producto.id] ?? []}
          supabaseUrl={supabaseUrl}
          isMaster={isMaster}
          initialTab={drawerState.tab}
          canales={canalesIniciales}
          asignacionesIniciales={drawerAsignaciones}
          multiplosIniciales={drawerMultiplos}
          descripcionInicial={drawerState.producto.descripcion ?? null}
          dimensionesIniciales={drawerDimensiones}
          onClose={() => setDrawerState(null)}
          onFotosChange={(productoId, fotos) =>
            setFotosMap(prev => ({ ...prev, [productoId]: fotos }))
          }
          onCanalesChange={handleCanalesChange}
          onDimensionesChange={(productoId, dims) =>
            setDimensiones(prev => ({ ...prev, [productoId]: dims }))
          }
        />
      )}
    </>
  )
}
