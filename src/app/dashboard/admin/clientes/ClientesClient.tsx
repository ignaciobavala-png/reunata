'use client'

import { useState, useTransition, Fragment } from 'react'
import { aprobarCliente, actualizarCanalCliente } from '@/app/actions/clientes'
import { Check, X, Search, Loader2, ChevronDown, ChevronRight, Store, Building2, MapPin, Globe, Phone, Users, PackageOpen } from 'lucide-react'

interface Canal   { id: number; slug: string; nombre: string }
interface Cliente {
  id: string
  nombre: string | null
  email: string | null
  rol: string
  aprobado: boolean | null
  canal_id: number | null
  cuit_dni: string | null
  created_at: string
  razon_social: string | null
  direccion: string | null
  localidad: string | null
  sitio_web: string | null
  puntos_venta: number | null
  clientes_activos: number | null
  telefono: string | null
}

const LABEL_ROL: Record<string, string> = {
  consumidor_final: 'Consumidor',
  distribuidor: 'Distribuidor',
  local: 'Local',
  mercha: 'Merchandising',
}

const COLOR_ROL: Record<string, string> = {
  consumidor_final: '#6366f1',
  distribuidor:     '#0ea5e9',
  local:            '#10b981',
  mercha:           '#f59e0b',
}

export function ClientesClient({ clientes: inicial, canales }: { clientes: Cliente[]; canales: Canal[] }) {
  const [clientes, setClientes] = useState(inicial)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendientes' | 'aprobados'>('todos')
  const [isPending, startTransition] = useTransition()
  const [accionId, setAccionId] = useState<string | null>(null)
  const [expandido, setExpandido] = useState<string | null>(null)

  const filtrados = clientes.filter(c => {
    const q = busqueda.toLowerCase()
    const matchBusqueda = !busqueda ||
      c.nombre?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.cuit_dni?.toLowerCase().includes(q) ||
      c.razon_social?.toLowerCase().includes(q)
    const matchEstado =
      filtroEstado === 'todos' ? true :
      filtroEstado === 'pendientes' ? !c.aprobado :
      !!c.aprobado
    return matchBusqueda && matchEstado
  })

  function handleAprobar(id: string, aprobado: boolean) {
    setAccionId(id)
    setClientes(prev => prev.map(c => c.id === id ? { ...c, aprobado } : c))
    startTransition(async () => {
      await aprobarCliente(id, aprobado)
      setAccionId(null)
    })
  }

  function handleCanal(id: string, canalId: number | null) {
    setClientes(prev => prev.map(c => c.id === id ? { ...c, canal_id: canalId } : c))
    startTransition(() => actualizarCanalCliente(id, canalId))
  }

  function esMayorista(rol: string) {
    return rol === 'distribuidor' || rol === 'local' || rol === 'mercha'
  }

  return (
    <div>
      {/* Filtros */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-acero)' }} />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, email, CUIT o razón social…"
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border outline-none"
            style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
          />
        </div>
        <div className="flex gap-1">
          {(['todos', 'pendientes', 'aprobados'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltroEstado(f)}
              className="px-3 py-2 text-sm rounded-lg border transition-colors duration-150"
              style={{
                borderColor: filtroEstado === f ? 'var(--color-granito)' : 'var(--color-acero-claro)',
                background: filtroEstado === f ? 'var(--color-granito)' : 'white',
                color: filtroEstado === f ? 'var(--color-acero-brillo)' : 'var(--color-acero-oscuro)',
              }}
            >
              {f === 'todos' ? 'Todos' : f === 'pendientes' ? 'Pendientes' : 'Aprobados'}
            </button>
          ))}
        </div>
        <span className="text-sm self-center" style={{ color: 'var(--color-acero-oscuro)' }}>
          {filtrados.length} clientes
        </span>
        {isPending && <Loader2 size={14} className="self-center animate-spin" style={{ color: 'var(--color-acero-oscuro)' }} />}
      </div>

      {/* Tabla */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-acero-claro)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--color-granito-oscuro)' }}>
                {['', 'Cliente', 'Tipo', 'Canal', 'CUIT/DNI', 'Registro', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-acero-claro)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c, i) => (
                <Fragment key={c.id}>
                  <tr
                    className="cursor-pointer"
                    onClick={() => setExpandido(expandido === c.id ? null : c.id)}
                    style={{
                      background: i % 2 === 0 ? 'white' : 'var(--color-acero-brillo)',
                      borderBottom: '1px solid var(--color-acero-claro)',
                    }}
                  >
                    <td className="px-4 py-3">
                      {esMayorista(c.rol) && (
                        expandido === c.id
                          ? <ChevronDown size={14} style={{ color: 'var(--color-acero-oscuro)' }} />
                          : <ChevronRight size={14} style={{ color: 'var(--color-acero-oscuro)' }} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: 'var(--foreground)' }}>{c.nombre || '—'}</p>
                      <p style={{ color: 'var(--color-acero-oscuro)' }}>{c.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full"
                        style={{
                          background: (COLOR_ROL[c.rol] ?? '#888') + '22',
                          color: COLOR_ROL[c.rol] ?? '#888',
                        }}
                      >
                        {LABEL_ROL[c.rol] ?? c.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={c.canal_id ?? ''}
                        onChange={e => handleCanal(c.id, e.target.value ? Number(e.target.value) : null)}
                        className="text-sm rounded border px-2 py-1 outline-none"
                        style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
                        onClick={e => e.stopPropagation()}
                      >
                        <option value="">Sin canal</option>
                        {canales.map(ch => (
                          <option key={ch.id} value={ch.id}>{ch.nombre}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-acero-oscuro)' }}>
                      {c.cuit_dni || '—'}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-acero-oscuro)' }}>
                      {new Date(c.created_at).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-4 py-3">
                      {c.aprobado
                        ? <span className="px-2 py-0.5 rounded-full text-sm" style={{ background: '#10b98122', color: '#10b981' }}>Aprobado</span>
                        : <span className="px-2 py-0.5 rounded-full text-sm" style={{ background: '#f59e0b22', color: '#f59e0b' }}>Pendiente</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {!c.aprobado && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAprobar(c.id, true) }}
                            disabled={accionId === c.id}
                            className="p-1.5 rounded-lg font-medium transition-colors duration-150 disabled:opacity-50"
                            style={{ background: '#10b98122', color: '#10b981' }}
                            title="Aprobar"
                          >
                            <Check size={12} />
                          </button>
                        )}
                        {c.aprobado && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAprobar(c.id, false) }}
                            disabled={accionId === c.id}
                            className="p-1.5 rounded-lg font-medium transition-colors duration-150 disabled:opacity-50"
                            style={{ background: '#ef444422', color: '#ef4444' }}
                            title="Revocar acceso"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandido === c.id && esMayorista(c.rol) && (
                    <tr key={`${c.id}-detail`}>
                      <td colSpan={8} style={{ background: '#fafafa', borderBottom: '1px solid var(--color-acero-claro)' }}>
                        <div className="px-8 py-5 grid grid-cols-2 md:grid-cols-3 gap-5 text-sm">
                          {c.razon_social && (
                            <div className="flex items-center gap-2">
                              <Building2 size={14} style={{ color: 'var(--color-acero-oscuro)' }} />
                              <div>
                                <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-acero-oscuro)' }}>Razón Social</p>
                                <p style={{ color: 'var(--foreground)' }}>{c.razon_social}</p>
                              </div>
                            </div>
                          )}
                          {c.telefono && (
                            <div className="flex items-center gap-2">
                              <Phone size={14} style={{ color: 'var(--color-acero-oscuro)' }} />
                              <div>
                                <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-acero-oscuro)' }}>WhatsApp</p>
                                <p style={{ color: 'var(--foreground)' }}>{c.telefono}</p>
                              </div>
                            </div>
                          )}
                          {c.direccion && (
                            <div className="flex items-center gap-2">
                              <MapPin size={14} style={{ color: 'var(--color-acero-oscuro)' }} />
                              <div>
                                <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-acero-oscuro)' }}>Dirección</p>
                                <p style={{ color: 'var(--foreground)' }}>{c.direccion}</p>
                              </div>
                            </div>
                          )}
                          {c.localidad && (
                            <div className="flex items-center gap-2">
                              <MapPin size={14} style={{ color: 'var(--color-acero-oscuro)' }} />
                              <div>
                                <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-acero-oscuro)' }}>Localidad</p>
                                <p style={{ color: 'var(--foreground)' }}>{c.localidad}</p>
                              </div>
                            </div>
                          )}
                          {c.sitio_web && (
                            <div className="flex items-center gap-2">
                              <Globe size={14} style={{ color: 'var(--color-acero-oscuro)' }} />
                              <div>
                                <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-acero-oscuro)' }}>Sitio web</p>
                                <p style={{ color: 'var(--color-acero-oscuro)' }}>{c.sitio_web}</p>
                              </div>
                            </div>
                          )}
                          {c.puntos_venta != null && (
                            <div className="flex items-center gap-2">
                              <Store size={14} style={{ color: 'var(--color-acero-oscuro)' }} />
                              <div>
                                <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-acero-oscuro)' }}>Puntos de venta</p>
                                <p style={{ color: 'var(--foreground)' }}>{c.puntos_venta}</p>
                              </div>
                            </div>
                          )}
                          {c.clientes_activos != null && (
                            <div className="flex items-center gap-2">
                              <Users size={14} style={{ color: 'var(--color-acero-oscuro)' }} />
                              <div>
                                <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-acero-oscuro)' }}>Clientes activos</p>
                                <p style={{ color: 'var(--foreground)' }}>{c.clientes_activos}</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="px-8 pb-4">
                          <a
                            href={`/dashboard/admin/clientes/${c.id}`}
                            className="text-xs transition-opacity hover:opacity-70"
                            style={{ color: 'var(--color-acero-oscuro)' }}
                          >
                            Ver historial completo (pedidos + crédito) →
                          </a>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}

              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-base" style={{ color: 'var(--color-acero-oscuro)' }}>
                    No hay clientes registrados todavía.
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
