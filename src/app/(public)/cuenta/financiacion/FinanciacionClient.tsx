'use client'

import { useState, useTransition } from 'react'
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react'
import { crearSolicitudCredito, cancelarSolicitudCredito } from '@/app/actions/financiacion'
import { formatPrecio } from '@/lib/utils'

interface Solicitud {
  id: string
  monto: number | null
  plazo_dias: number | null
  garantias: string | null
  notas: string | null
  estado: string
  respuesta: string | null
  created_at: string
}

const PLAZOS = [
  { value: '30',  label: '30 días' },
  { value: '60',  label: '60 días' },
  { value: '90',  label: '90 días' },
  { value: '120', label: '120 días' },
]

const ESTADO_CONFIG: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string }> = {
  pendiente:  { label: 'En revisión',  icon: <Clock size={13} />,        bg: '#fef9c322', text: '#854d0e' },
  aprobado:   { label: 'Aprobado',     icon: <CheckCircle size={13} />,  bg: '#10b98122', text: '#10b981' },
  rechazado:  { label: 'No aprobado',  icon: <XCircle size={13} />,      bg: '#ef444422', text: '#ef4444' },
  cancelado:  { label: 'Cancelado',    icon: null,                        bg: '#88888822', text: '#888' },
}

export function FinanciacionClient({ solicitudes: inicial }: { solicitudes: Solicitud[] }) {
  const [solicitudes, setSolicitudes] = useState(inicial)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState(false)
  const [confirmCancelar, setConfirmCancelar] = useState<string | null>(null)

  const tienePendiente = solicitudes.some(s => s.estado === 'pendiente')

  function handleSubmit(fd: FormData) {
    setError(null)
    startTransition(async () => {
      const res = await crearSolicitudCredito(fd)
      if (res.error) { setError(res.error); return }
      setExito(true)
      setMostrarForm(false)
      setTimeout(() => setExito(false), 4000)
    })
  }

  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border outline-none'
  const inputStyle: React.CSSProperties = {
    borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)', background: 'white',
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Info */}
      <div className="rounded-xl border p-5 text-sm flex flex-col gap-2"
        style={{ background: 'var(--color-acero-brillo)', borderColor: 'var(--color-acero-claro)' }}>
        <p className="font-medium" style={{ color: 'var(--foreground)' }}>
          ¿Qué es la línea de crédito?
        </p>
        <p style={{ color: 'var(--color-acero-oscuro)' }}>
          Permite operar en cuenta corriente o con cheques a plazo. Evaluamos tu solicitud
          y te comunicamos la resolución por email en 48–72 hs hábiles.
        </p>
      </div>

      {/* Feedback */}
      {exito && (
        <div className="rounded-lg px-4 py-3 text-sm flex items-center gap-2"
          style={{ background: '#10b98122', color: '#10b981' }}>
          <CheckCircle size={15} />
          Solicitud enviada. Te contactaremos a la brevedad.
        </div>
      )}

      {/* Botón nueva solicitud */}
      {!tienePendiente && !mostrarForm && (
        <button
          onClick={() => setMostrarForm(true)}
          className="self-start px-5 py-2.5 rounded-lg text-sm font-medium"
          style={{ background: 'var(--color-granito)', color: 'var(--color-acero-brillo)' }}>
          Solicitar línea de crédito
        </button>
      )}

      {/* Formulario */}
      {mostrarForm && (
        <form action={handleSubmit} className="rounded-xl border p-5 flex flex-col gap-4"
          style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}>
          <h2 className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            Nueva solicitud
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>
                Monto solicitado (AR$) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input name="monto" type="number" min="1" step="1000" required
                placeholder="Ej: 500000" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>
                Plazo <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select name="plazo_dias" required className={inputClass} style={inputStyle}>
                <option value="">Seleccioná un plazo</option>
                {PLAZOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>
              Garantías ofrecidas (opcional)
            </label>
            <input name="garantias" type="text" className={inputClass} style={inputStyle}
              placeholder="Ej: aval personal, bien inmueble, cheques propios" />
          </div>

          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>
              Información adicional (opcional)
            </label>
            <textarea name="notas" rows={3} className={inputClass} style={inputStyle}
              placeholder="Contanos más sobre tu negocio o el motivo de la solicitud" />
          </div>

          {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setMostrarForm(false); setError(null) }}
              className="px-4 py-2 text-sm rounded-lg border"
              style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}>
              Cancelar
            </button>
            <button type="submit" disabled={isPending}
              className="px-4 py-2 text-sm rounded-lg flex items-center gap-1.5 disabled:opacity-60"
              style={{ background: 'var(--color-granito)', color: 'var(--color-acero-brillo)' }}>
              {isPending && <Loader2 size={13} className="animate-spin" />}
              Enviar solicitud
            </button>
          </div>
        </form>
      )}

      {/* Historial */}
      {solicitudes.length > 0 && (
        <div>
          <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--foreground)' }}>
            Mis solicitudes
          </h2>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-acero-claro)' }}>
            {solicitudes.map((s, i) => {
              const cfg = ESTADO_CONFIG[s.estado] ?? ESTADO_CONFIG.cancelado
              return (
                <div key={s.id}
                  className="p-5"
                  style={{ borderBottom: i < solicitudes.length - 1 ? '1px solid var(--color-acero-claro)' : 'none',
                    background: i % 2 === 0 ? 'white' : 'var(--color-acero-brillo)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {s.monto && (
                          <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                            {formatPrecio(s.monto)}
                          </span>
                        )}
                        {s.plazo_dias && (
                          <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                            · {s.plazo_dias} días
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                          style={{ background: cfg.bg, color: cfg.text }}>
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </div>
                      <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                        {new Date(s.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                      {s.respuesta && (
                        <p className="text-sm mt-1 p-3 rounded-lg"
                          style={{ background: s.estado === 'aprobado' ? '#10b98111' : '#ef444411',
                            color: s.estado === 'aprobado' ? '#10b981' : '#ef4444' }}>
                          {s.respuesta}
                        </p>
                      )}
                    </div>

                    {s.estado === 'pendiente' && (
                      confirmCancelar === s.id ? (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button onClick={() => startTransition(async () => {
                              await cancelarSolicitudCredito(s.id)
                              setSolicitudes(prev => prev.map(x => x.id === s.id ? { ...x, estado: 'cancelado' } : x))
                              setConfirmCancelar(null)
                            })}
                            className="text-xs px-2 py-1 rounded"
                            style={{ background: '#fee2e2', color: '#ef4444' }}>
                            Confirmar
                          </button>
                          <button onClick={() => setConfirmCancelar(null)}
                            className="text-xs px-2 py-1 rounded border"
                            style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}>
                            No
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmCancelar(s.id)}
                          className="text-xs flex-shrink-0"
                          style={{ color: 'var(--color-acero-oscuro)' }}>
                          Cancelar solicitud
                        </button>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
