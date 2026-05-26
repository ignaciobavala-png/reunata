'use client'

import { useState, useTransition } from 'react'
import { actualizarEstadoCorporativo, eliminarCorporativo } from '@/app/actions/corporativos'
import { Check, X, Search, Loader2, Trash2 } from 'lucide-react'

interface Corporativo {
  id: string
  nombre: string | null
  empresa: string | null
  email: string | null
  telefono: string | null
  cuit: string | null
  ubicacion: string | null
  ocasion: string | null
  cantidades: number | null
  productos: string[] | null
  personalizar: string | null
  fecha_limite: string | null
  estado: string
  created_at: string
  updated_at: string | null
  logo_url: string | null
}

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
}

const ESTADO_COLOR: Record<string, string> = {
  pendiente: '#f59e0b',
  aprobado: '#10b981',
  rechazado: '#ef4444',
}

const OCASIONES = [
  'Tu equipo de trabajo',
  'Un Evento',
  'Regalos para clientes',
  'Sos empresa de Mercha',
  'Otro',
]

export function CorporativosClient({ corporativos: inicial }: { corporativos: Corporativo[] }) {
  const [corporativos, setCorporativos] = useState(inicial)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente' | 'aprobado' | 'rechazado'>('todos')
  const [filtroOcasion, setFiltroOcasion] = useState<string>('todos')
  const [detalleId, setDetalleId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [accionId, setAccionId] = useState<string | null>(null)

  const filtradas = corporativos.filter(c => {
    const q = busqueda.toLowerCase()
    const matchBusqueda =
      !busqueda ||
      c.nombre?.toLowerCase().includes(q) ||
      c.empresa?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    const matchEstado = filtroEstado === 'todos' || c.estado === filtroEstado
    const matchOcasion = filtroOcasion === 'todos' || c.ocasion === filtroOcasion
    return matchBusqueda && matchEstado && matchOcasion
  })

  const detalle = detalleId ? corporativos.find(c => c.id === detalleId) : null

  function handleEstado(id: string, estado: 'aprobado' | 'rechazado') {
    setAccionId(id)
    const anterior = corporativos.find(c => c.id === id)
    setCorporativos(prev => prev.map(c => c.id === id ? { ...c, estado } : c))
    startTransition(async () => {
      const res = await actualizarEstadoCorporativo(id, estado)
      if (res.error && anterior) {
        setCorporativos(prev => prev.map(c => c.id === id ? anterior : c))
      }
      setAccionId(null)
    })
  }

  function handleEliminar(id: string) {
    setAccionId(id)
    const eliminada = corporativos.find(c => c.id === id)
    setCorporativos(prev => prev.filter(c => c.id !== id))
    startTransition(async () => {
      const res = await eliminarCorporativo(id)
      if (res.error && eliminada) {
        setCorporativos(prev => [...prev, eliminada])
      }
      setAccionId(null)
    })
  }

  return (
    <div>
      {/* Filtros */}
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <div className="relative max-w-xs flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-acero)' }} />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, empresa o email…"
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border outline-none"
            style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
          />
        </div>

        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value as typeof filtroEstado)}
          className="px-3 py-2 text-sm rounded-lg border outline-none"
          style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
        >
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendientes</option>
          <option value="aprobado">Aprobados</option>
          <option value="rechazado">Rechazados</option>
        </select>

        <select
          value={filtroOcasion}
          onChange={e => setFiltroOcasion(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border outline-none"
          style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
        >
          <option value="todos">Todas las ocasiones</option>
          {OCASIONES.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>

        <span className="text-sm ml-auto" style={{ color: 'var(--color-acero-oscuro)' }}>
          {filtradas.length} de {corporativos.length}
        </span>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--color-acero-claro)' }}>
              <th className="pb-3 font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>Nombre</th>
              <th className="pb-3 font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>Empresa</th>
              <th className="pb-3 font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>Email</th>
              <th className="pb-3 font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>Ocasión</th>
              <th className="pb-3 font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>Estado</th>
              <th className="pb-3 font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>Fecha</th>
              <th className="pb-3 font-medium text-right" style={{ color: 'var(--color-acero-oscuro)' }}>Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--color-acero-claro)' }}>
            {filtradas.map(c => (
              <tr key={c.id} className="hover:bg-white/5 transition-colors">
                <td className="py-3">
                  <button
                    onClick={() => setDetalleId(detalleId === c.id ? null : c.id)}
                    className="text-left flex items-center gap-2 group"
                  >
                    <span style={{ color: 'var(--foreground)' }}>
                      {c.nombre || c.email || '—'}
                    </span>
                    <span className="opacity-0 group-hover:opacity-50 transition-opacity">+</span>
                  </button>
                </td>
                <td className="py-3" style={{ color: 'var(--color-acero)' }}>{c.empresa || '—'}</td>
                <td className="py-3">
                  <span style={{ color: 'var(--color-acero)' }}>{c.email || '—'}</span>
                  {c.telefono && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-acero-oscuro)' }}>{c.telefono}</p>
                  )}
                </td>
                <td className="py-3" style={{ color: 'var(--color-acero)' }}>{c.ocasion || '—'}</td>
                <td className="py-3">
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-sm font-medium"
                    style={{ background: `${ESTADO_COLOR[c.estado]}18`, color: ESTADO_COLOR[c.estado] }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: ESTADO_COLOR[c.estado] }} />
                    {ESTADO_LABEL[c.estado]}
                  </span>
                </td>
                <td className="py-3" style={{ color: 'var(--color-acero-oscuro)' }}>
                  {new Date(c.created_at).toLocaleDateString('es-AR')}
                </td>
                <td className="py-3">
                  {c.estado === 'pendiente' ? (
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => handleEstado(c.id, 'aprobado')}
                        disabled={isPending}
                        className="p-1.5 rounded-md transition-colors hover:bg-green-50"
                        title="Aprobar"
                      >
                        {accionId === c.id ? (
                          <Loader2 size={14} className="animate-spin" style={{ color: '#10b981' }} />
                        ) : (
                          <Check size={14} style={{ color: '#10b981' }} />
                        )}
                      </button>
                      <button
                        onClick={() => handleEstado(c.id, 'rechazado')}
                        disabled={isPending}
                        className="p-1.5 rounded-md transition-colors hover:bg-red-50"
                        title="Rechazar"
                      >
                        {accionId === c.id ? (
                          <Loader2 size={14} className="animate-spin" style={{ color: '#ef4444' }} />
                        ) : (
                          <X size={14} style={{ color: '#ef4444' }} />
                        )}
                      </button>
                      <button
                        onClick={() => handleEliminar(c.id)}
                        disabled={isPending}
                        className="p-1.5 rounded-md transition-colors hover:bg-red-50"
                        title="Eliminar"
                      >
                        <Trash2 size={14} style={{ color: '#6b7280' }} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => handleEliminar(c.id)}
                        disabled={isPending}
                        className="p-1.5 rounded-md transition-colors hover:bg-red-50"
                        title="Eliminar"
                      >
                        <Trash2 size={14} style={{ color: '#6b7280' }} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center" style={{ color: 'var(--color-acero-oscuro)' }}>
                  No se encontraron solicitudes corporativas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detalle expandido */}
      {detalle && (
        <div
          className="mt-6 p-6 rounded-xl border"
          style={{ borderColor: 'var(--color-acero-claro)', background: 'var(--color-granito)' }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              {detalle.logo_url && (
                <img
                  src={detalle.logo_url}
                  alt="Logo"
                  className="w-12 h-12 rounded-lg object-contain border"
                  style={{ borderColor: 'var(--color-acero-oscuro)', background: 'white' }}
                />
              )}
              <h3 className="text-base font-semibold" style={{ color: 'var(--color-acero-brillo)' }}>
                Detalle de solicitud
              </h3>
            </div>
            <button
              onClick={() => setDetalleId(null)}
              className="text-xl leading-none"
              style={{ color: 'var(--color-acero-oscuro)' }}
            >
              ×
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-base">
            <div>
              <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Nombre</span>
              <p style={{ color: 'var(--color-acero-brillo)' }}>{detalle.nombre}</p>
            </div>
            <div>
              <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Empresa</span>
              <p style={{ color: 'var(--color-acero-brillo)' }}>{detalle.empresa}</p>
            </div>
            <div>
              <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Email</span>
              <p style={{ color: 'var(--color-acero-brillo)' }}>{detalle.email}</p>
            </div>
            <div>
              <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Teléfono</span>
              <p style={{ color: 'var(--color-acero-brillo)' }}>{detalle.telefono || '—'}</p>
            </div>
            <div>
              <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>CUIT / DNI</span>
              <p style={{ color: 'var(--color-acero-brillo)' }}>{detalle.cuit || '—'}</p>
            </div>
            <div>
              <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Ubicación</span>
              <p style={{ color: 'var(--color-acero-brillo)' }}>{detalle.ubicacion || '—'}</p>
            </div>
            <div>
              <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Ocasión</span>
              <p style={{ color: 'var(--color-acero-brillo)' }}>{detalle.ocasion || '—'}</p>
            </div>
            <div>
              <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Cantidades</span>
              <p style={{ color: 'var(--color-acero-brillo)' }}>{detalle.cantidades ?? '—'}</p>
            </div>
            <div>
              <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Personalizar</span>
              <p style={{ color: 'var(--color-acero-brillo)' }}>{detalle.personalizar || '—'}</p>
            </div>
            <div>
              <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Fecha límite</span>
              <p style={{ color: 'var(--color-acero-brillo)' }}>
                {detalle.fecha_limite ? new Date(detalle.fecha_limite).toLocaleDateString('es-AR') : '—'}
              </p>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Productos de interés</span>
              <p style={{ color: 'var(--color-acero-brillo)' }}>
                {detalle.productos && detalle.productos.length > 0
                  ? detalle.productos.join(', ')
                  : '—'}
              </p>
            </div>
            <div>
              <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Estado</span>
              <p>
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-sm font-medium"
                  style={{ background: `${ESTADO_COLOR[detalle.estado]}18`, color: ESTADO_COLOR[detalle.estado] }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: ESTADO_COLOR[detalle.estado] }} />
                  {ESTADO_LABEL[detalle.estado]}
                </span>
              </p>
            </div>
            <div>
              <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Recibido</span>
              <p style={{ color: 'var(--color-acero-brillo)' }}>
                {new Date(detalle.created_at).toLocaleString('es-AR')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
