'use client'

import { useState, useTransition } from 'react'
import { invitarEmpleado, desactivarEmpleado } from '@/app/actions/empleados'
import { UserPlus, Loader2, X } from 'lucide-react'

interface Empleado {
  id: string
  nombre: string | null
  email: string | null
  rol: string
  activo: boolean | null
  created_at: string
}

const LABEL_ROL: Record<string, string> = {
  master: 'Master',
  empleado: 'Empleado',
  comisionista: 'Comisionista',
}

const COLOR_ROL: Record<string, string> = {
  master:       '#6366f1',
  empleado:     '#0ea5e9',
  comisionista: '#f59e0b',
}

export function EmpleadosClient({ empleados: inicial }: { empleados: Empleado[] }) {
  const [empleados, setEmpleados] = useState(inicial)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)

  function handleInvitar(formData: FormData) {
    setError(null)
    setExito(false)
    startTransition(async () => {
      const res = await invitarEmpleado(formData)
      if (res?.error) {
        setError(res.error)
      } else {
        setExito(true)
        setMostrarForm(false)
      }
    })
  }

  function handleDesactivar(id: string) {
    setEmpleados(prev => prev.map(e => e.id === id ? { ...e, activo: false } : e))
    startTransition(() => desactivarEmpleado(id))
  }

  return (
    <div>
      {/* Header con botón invitar */}
      <div className="flex justify-between items-center mb-6">
        <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
          {empleados.length} {empleados.length === 1 ? 'usuario interno' : 'usuarios internos'}
        </span>
        <button
          onClick={() => { setMostrarForm(true); setExito(false); setError(null) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors duration-150"
          style={{ background: 'var(--color-granito)', color: 'var(--color-acero-brillo)' }}
        >
          <UserPlus size={13} />
          Invitar empleado
        </button>
      </div>

      {/* Formulario de invitación */}
      {mostrarForm && (
        <div
          className="rounded-xl border p-6 mb-6"
          style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}
        >
          <div className="flex justify-between items-center mb-4">
            <p className="text-base font-medium" style={{ color: 'var(--foreground)' }}>
              Invitar nuevo usuario interno
            </p>
            <button onClick={() => setMostrarForm(false)}>
              <X size={14} style={{ color: 'var(--color-acero-oscuro)' }} />
            </button>
          </div>
          <form action={handleInvitar} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>Nombre completo</label>
              <input
                name="nombre"
                required
                placeholder="Ej: María García"
                className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>Email</label>
              <input
                name="email"
                type="email"
                required
                placeholder="empleado@reunata.com"
                className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>Rol</label>
              <select
                name="rol"
                required
                className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
              >
                <option value="empleado">Empleado</option>
                <option value="comisionista">Comisionista</option>
              </select>
            </div>
            <div className="md:col-span-3 flex items-center gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm disabled:opacity-60"
                style={{ background: 'var(--color-granito)', color: 'var(--color-acero-brillo)' }}
              >
                {isPending && <Loader2 size={12} className="animate-spin" />}
                Enviar invitación
              </button>
              {error && <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>}
            </div>
          </form>
        </div>
      )}

      {exito && (
        <div className="rounded-lg px-4 py-3 mb-4 text-sm" style={{ background: '#10b98122', color: '#10b981' }}>
          Invitación enviada. El usuario recibirá un email para activar su cuenta.
        </div>
      )}

      {/* Tabla */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-acero-claro)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--color-granito-oscuro)' }}>
              {['Usuario', 'Rol', 'Desde', 'Estado', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-acero-claro)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {empleados.map((e, i) => (
              <tr
                key={e.id}
                style={{
                  background: i % 2 === 0 ? 'white' : 'var(--color-acero-brillo)',
                  borderBottom: '1px solid var(--color-acero-claro)',
                  opacity: e.activo === false ? 0.5 : 1,
                }}
              >
                <td className="px-4 py-3">
                  <p className="font-medium" style={{ color: 'var(--foreground)' }}>{e.nombre || '—'}</p>
                  <p style={{ color: 'var(--color-acero-oscuro)' }}>{e.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="px-2 py-0.5 rounded-full"
                    style={{
                      background: (COLOR_ROL[e.rol] ?? '#888') + '22',
                      color: COLOR_ROL[e.rol] ?? '#888',
                    }}
                  >
                    {LABEL_ROL[e.rol] ?? e.rol}
                  </span>
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--color-acero-oscuro)' }}>
                  {new Date(e.created_at).toLocaleDateString('es-AR')}
                </td>
                <td className="px-4 py-3">
                  {e.activo !== false
                    ? <span className="px-2 py-0.5 rounded-full" style={{ background: '#10b98122', color: '#10b981' }}>Activo</span>
                    : <span className="px-2 py-0.5 rounded-full" style={{ background: '#ef444422', color: '#ef4444' }}>Inactivo</span>
                  }
                </td>
                <td className="px-4 py-3">
                  {e.activo !== false && e.rol !== 'master' && (
                    <button
                      onClick={() => handleDesactivar(e.id)}
                      className="text-sm px-2 py-1 rounded border transition-colors duration-150"
                      style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}
                    >
                      Desactivar
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {empleados.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-base" style={{ color: 'var(--color-acero-oscuro)' }}>
                  No hay usuarios internos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
