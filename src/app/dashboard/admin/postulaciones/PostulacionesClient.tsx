'use client'

import { useState, useTransition } from 'react'
import { actualizarEstadoPostulacion, eliminarPostulacion } from '@/app/actions/postulaciones'
import { Check, X, Search, FileText, Loader2, Trash2 } from 'lucide-react'

interface Postulacion {
  id: string
  tipo: string
  nombre: string | null
  apellido: string | null
  email: string | null
  dni: string | null
  direccion: string | null
  nacionalidad: string | null
  cv_url: string | null
  movilidad_propia: boolean | null
  zonas: string | null
  otras_marcas: string | null
  cargo: string | null
  empresa: string | null
  cuit: string | null
  pagina_web: string | null
  productos_servicios: string | null
  otras_empresas_provee: string | null
  estado: string
  created_at: string
}

const TIPO_LABEL: Record<string, string> = {
  fulltime: 'Full Time',
  comisionista: 'Comisionista',
  proveedor: 'Proveedor',
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

export function PostulacionesClient({ postulaciones: inicial }: { postulaciones: Postulacion[] }) {
  const [postulaciones, setPostulaciones] = useState(inicial)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente' | 'aprobado' | 'rechazado'>('todos')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'fulltime' | 'comisionista' | 'proveedor'>('todos')
  const [detalleId, setDetalleId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [accionId, setAccionId] = useState<string | null>(null)

  const filtradas = postulaciones.filter(p => {
    const q = busqueda.toLowerCase()
    const match =
      (!busqueda || p.nombre?.toLowerCase().includes(q) || p.apellido?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q) || p.dni?.toLowerCase().includes(q))
    const matchEstado = filtroEstado === 'todos' || p.estado === filtroEstado
    const matchTipo = filtroTipo === 'todos' || p.tipo === filtroTipo
    return match && matchEstado && matchTipo
  })

  const detallePostulacion = detalleId ? postulaciones.find(p => p.id === detalleId) : null

  function handleEstado(id: string, estado: 'aprobado' | 'rechazado') {
    setAccionId(id)
    const anterior = postulaciones.find(p => p.id === id)
    setPostulaciones(prev => prev.map(p => p.id === id ? { ...p, estado } : p))
    startTransition(async () => {
      const res = await actualizarEstadoPostulacion(id, estado)
      if (res.error && anterior) {
        setPostulaciones(prev => prev.map(p => p.id === id ? anterior : p))
      }
      setAccionId(null)
    })
  }

  function handleEliminar(id: string) {
    setAccionId(id)
    const eliminada = postulaciones.find(p => p.id === id)
    setPostulaciones(prev => prev.filter(p => p.id !== id))
    startTransition(async () => {
      const res = await eliminarPostulacion(id)
      if (res.error && eliminada) {
        setPostulaciones(prev => [...prev, eliminada])
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
            placeholder="Buscar por nombre, email o DNI…"
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border outline-none"
            style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
          />
        </div>

        <select
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value as typeof filtroTipo)}
          className="px-3 py-2 text-sm rounded-lg border outline-none"
          style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
        >
          <option value="todos">Todos los tipos</option>
          <option value="fulltime">Full Time</option>
          <option value="comisionista">Comisionista</option>
          <option value="proveedor">Proveedor</option>
        </select>

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

        <span className="text-sm ml-auto" style={{ color: 'var(--color-acero-oscuro)' }}>
          {filtradas.length} de {postulaciones.length}
        </span>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--color-acero-claro)' }}>
              <th className="pb-3 font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>Nombre</th>
              <th className="pb-3 font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>Email</th>
              <th className="pb-3 font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>Tipo</th>
              <th className="pb-3 font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>Estado</th>
              <th className="pb-3 font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>Fecha</th>
              <th className="pb-3 font-medium text-right" style={{ color: 'var(--color-acero-oscuro)' }}>Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--color-acero-claro)' }}>
            {filtradas.map(p => (
              <tr key={p.id} className="hover:bg-white/5 transition-colors">
                <td className="py-3">
                  <button
                    onClick={() => setDetalleId(detalleId === p.id ? null : p.id)}
                    className="text-left flex items-center gap-2 group"
                  >
                    <span style={{ color: 'var(--color-acero-brillo)' }}>
                      {p.nombre} {p.apellido}
                    </span>
                    <span className="opacity-0 group-hover:opacity-50 transition-opacity">+</span>
                  </button>
                </td>
                <td className="py-3" style={{ color: 'var(--color-acero)' }}>{p.email}</td>
                <td className="py-3" style={{ color: 'var(--color-acero)' }}>{TIPO_LABEL[p.tipo]}</td>
                <td className="py-3">
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-sm font-medium"
                    style={{ background: `${ESTADO_COLOR[p.estado]}18`, color: ESTADO_COLOR[p.estado] }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: ESTADO_COLOR[p.estado] }} />
                    {ESTADO_LABEL[p.estado]}
                  </span>
                </td>
                <td className="py-3" style={{ color: 'var(--color-acero-oscuro)' }}>
                  {new Date(p.created_at).toLocaleDateString('es-AR')}
                </td>
                <td className="py-3">
                  {p.estado === 'pendiente' ? (
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => handleEstado(p.id, 'aprobado')}
                        disabled={isPending}
                        className="p-1.5 rounded-md transition-colors hover:bg-green-50"
                        title="Aprobar"
                      >
                        {accionId === p.id ? (
                          <Loader2 size={14} className="animate-spin" style={{ color: '#10b981' }} />
                        ) : (
                          <Check size={14} style={{ color: '#10b981' }} />
                        )}
                      </button>
                      <button
                        onClick={() => handleEstado(p.id, 'rechazado')}
                        disabled={isPending}
                        className="p-1.5 rounded-md transition-colors hover:bg-red-50"
                        title="Rechazar"
                      >
                        {accionId === p.id ? (
                          <Loader2 size={14} className="animate-spin" style={{ color: '#ef4444' }} />
                        ) : (
                          <X size={14} style={{ color: '#ef4444' }} />
                        )}
                      </button>
                      <button
                        onClick={() => handleEliminar(p.id)}
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
                        onClick={() => handleEliminar(p.id)}
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
                <td colSpan={6} className="py-12 text-center" style={{ color: 'var(--color-acero-oscuro)' }}>
                  No se encontraron postulaciones.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detalle expandido */}
      {detallePostulacion && (
        <div
          className="mt-6 p-6 rounded-xl border"
          style={{ borderColor: 'var(--color-acero-claro)', background: 'var(--color-granito)' }}
        >
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-base font-semibold" style={{ color: 'var(--color-acero-brillo)' }}>
              Detalle de postulación
            </h3>
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
              <p style={{ color: 'var(--color-acero-brillo)' }}>{detallePostulacion.nombre}</p>
            </div>
            <div>
              <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Apellido</span>
              <p style={{ color: 'var(--color-acero-brillo)' }}>{detallePostulacion.apellido}</p>
            </div>
            <div>
              <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Email</span>
              <p style={{ color: 'var(--color-acero-brillo)' }}>{detallePostulacion.email}</p>
            </div>
            <div>
              <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>DNI</span>
              <p style={{ color: 'var(--color-acero-brillo)' }}>{detallePostulacion.dni}</p>
            </div>
            <div>
              <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Dirección</span>
              <p style={{ color: 'var(--color-acero-brillo)' }}>{detallePostulacion.direccion}</p>
            </div>
            <div>
              <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Nacionalidad</span>
              <p style={{ color: 'var(--color-acero-brillo)' }}>{detallePostulacion.nacionalidad}</p>
            </div>
            {detallePostulacion.tipo === 'fulltime' && (
              <div className="sm:col-span-2 lg:col-span-3">
                <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>CV</span>
                {detallePostulacion.cv_url ? (
                  <a
                    href={detallePostulacion.cv_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 mt-1 text-base underline underline-offset-2"
                    style={{ color: 'var(--color-acero-brillo)' }}
                  >
                    <FileText size={14} />
                    Ver currículum
                  </a>
                ) : (
                  <p style={{ color: 'var(--color-acero-oscuro)' }}>No se adjuntó CV</p>
                )}
              </div>
            )}
            {detallePostulacion.tipo === 'comisionista' && (
              <>
                <div>
                  <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Movilidad propia</span>
                  <p style={{ color: 'var(--color-acero-brillo)' }}>
                    {detallePostulacion.movilidad_propia ? 'Sí' : 'No'}
                  </p>
                </div>
                <div>
                  <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Zonas</span>
                  <p style={{ color: 'var(--color-acero-brillo)' }}>{detallePostulacion.zonas || '—'}</p>
                </div>
                <div>
                  <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Otras marcas</span>
                  <p style={{ color: 'var(--color-acero-brillo)' }}>{detallePostulacion.otras_marcas || '—'}</p>
                </div>
              </>
            )}
            {detallePostulacion.tipo === 'proveedor' && (
              <>
                <div>
                  <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Cargo</span>
                  <p style={{ color: 'var(--color-acero-brillo)' }}>{detallePostulacion.cargo || '—'}</p>
                </div>
                <div>
                  <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Empresa</span>
                  <p style={{ color: 'var(--color-acero-brillo)' }}>{detallePostulacion.empresa || '—'}</p>
                </div>
                <div>
                  <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>CUIT</span>
                  <p style={{ color: 'var(--color-acero-brillo)' }}>{detallePostulacion.cuit || '—'}</p>
                </div>
                <div>
                  <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Página Web</span>
                  <p style={{ color: 'var(--color-acero-brillo)' }}>
                    {detallePostulacion.pagina_web ? (
                      <a href={detallePostulacion.pagina_web} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                        {detallePostulacion.pagina_web}
                      </a>
                    ) : '—'}
                  </p>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Productos o Servicio que ofrece</span>
                  <p style={{ color: 'var(--color-acero-brillo)' }}>{detallePostulacion.productos_servicios || '—'}</p>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Otras empresas a las que provee</span>
                  <p style={{ color: 'var(--color-acero-brillo)' }}>{detallePostulacion.otras_empresas_provee || '—'}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
