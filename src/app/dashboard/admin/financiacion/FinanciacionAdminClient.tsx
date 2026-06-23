'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { responderSolicitudCredito } from '@/app/actions/financiacion'
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
  cliente_id: string | null
  profiles: { nombre: string | null; email: string | null; razon_social: string | null } | null
}

const ESTADO_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pendiente: { label: 'En revisión', bg: '#fef9c322', text: '#854d0e' },
  aprobado:  { label: 'Aprobado',    bg: '#10b98122', text: '#10b981' },
  rechazado: { label: 'No aprobado', bg: '#ef444422', text: '#ef4444' },
  cancelado: { label: 'Cancelado',   bg: '#88888822', text: '#888'    },
}

function SolicitudRow({ s }: { s: Solicitud }) {
  const [open, setOpen]         = useState(false)
  const [respuesta, setRespuesta] = useState(s.respuesta ?? '')
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback]   = useState<string | null>(null)

  const cfg = ESTADO_CONFIG[s.estado] ?? ESTADO_CONFIG.cancelado
  const cliente = s.profiles?.razon_social ?? s.profiles?.nombre ?? s.profiles?.email ?? '—'

  function responder(estado: 'aprobado' | 'rechazado') {
    setFeedback(null)
    startTransition(async () => {
      const res = await responderSolicitudCredito(s.id, estado, respuesta)
      if (res.error) setFeedback(res.error)
      else { setFeedback('Guardado'); setTimeout(() => setFeedback(null), 2000) }
    })
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-acero-claro)' }}>
      {/* Header fila */}
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
        style={{ background: open ? 'var(--color-acero-brillo)' : 'white' }}>
        <div className="flex items-center gap-4 flex-wrap">
          {s.cliente_id ? (
            <Link
              href={`/dashboard/admin/clientes/${s.cliente_id}`}
              onClick={e => e.stopPropagation()}
              className="text-sm font-medium hover:underline"
              style={{ color: 'var(--foreground)' }}
            >
              {cliente}
            </Link>
          ) : (
            <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{cliente}</span>
          )}
          {s.monto && (
            <span className="text-sm tabular-nums" style={{ color: 'var(--color-acero-oscuro)' }}>
              {formatPrecio(s.monto)}
            </span>
          )}
          {s.plazo_dias && (
            <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>{s.plazo_dias} días</span>
          )}
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.text }}>
            {cfg.label}
          </span>
          <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
            {new Date(s.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Detalle expandible */}
      {open && (
        <div className="px-5 pb-5 pt-3 flex flex-col gap-4 border-t"
          style={{ borderColor: 'var(--color-acero-claro)', background: 'white' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>Email: </span>
              <span style={{ color: 'var(--foreground)' }}>{s.profiles?.email ?? '—'}</span>
            </div>
            {s.garantias && (
              <div>
                <span className="font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>Garantías: </span>
                <span style={{ color: 'var(--foreground)' }}>{s.garantias}</span>
              </div>
            )}
            {s.notas && (
              <div className="sm:col-span-2">
                <span className="font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>Notas: </span>
                <span style={{ color: 'var(--foreground)' }}>{s.notas}</span>
              </div>
            )}
          </div>

          {s.estado === 'pendiente' && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>
                Respuesta al cliente (opcional)
              </label>
              <textarea
                value={respuesta}
                onChange={e => setRespuesta(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)', background: 'white' }}
                placeholder="Ej: Aprobamos hasta $X con plazo de Y días..."
              />
              <div className="flex gap-2">
                <button onClick={() => responder('aprobado')} disabled={isPending}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg disabled:opacity-60"
                  style={{ background: '#10b981', color: 'white' }}>
                  {isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                  Aprobar
                </button>
                <button onClick={() => responder('rechazado')} disabled={isPending}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg disabled:opacity-60"
                  style={{ background: '#ef4444', color: 'white' }}>
                  {isPending ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                  No aprobar
                </button>
                {feedback && (
                  <span className="text-xs self-center" style={{ color: feedback === 'Guardado' ? '#10b981' : '#ef4444' }}>
                    {feedback}
                  </span>
                )}
              </div>
            </div>
          )}

          {s.respuesta && s.estado !== 'pendiente' && (
            <p className="text-sm p-3 rounded-lg"
              style={{ background: s.estado === 'aprobado' ? '#10b98111' : '#ef444411',
                color: s.estado === 'aprobado' ? '#10b981' : '#ef4444' }}>
              Respuesta enviada: {s.respuesta}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

type Filtro = 'todos' | 'pendiente' | 'aprobado' | 'rechazado'

export function FinanciacionAdminClient({ solicitudes }: { solicitudes: Solicitud[] }) {
  const [filtro, setFiltro] = useState<Filtro>('pendiente')

  const filtradas = filtro === 'todos' ? solicitudes : solicitudes.filter(s => s.estado === filtro)
  const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length

  const tabs: { key: Filtro; label: string }[] = [
    { key: 'pendiente', label: `En revisión${pendientes > 0 ? ` (${pendientes})` : ''}` },
    { key: 'aprobado',  label: 'Aprobadas' },
    { key: 'rechazado', label: 'No aprobadas' },
    { key: 'todos',     label: 'Todas' },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--color-acero-claro)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setFiltro(t.key)}
            className="px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              color:        filtro === t.key ? 'var(--foreground)' : 'var(--color-acero-oscuro)',
              borderBottom: filtro === t.key ? '2px solid var(--foreground)' : '2px solid transparent',
              marginBottom: '-1px',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {filtradas.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
            No hay solicitudes en esta categoría.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtradas.map(s => <SolicitudRow key={s.id} s={s} />)}
        </div>
      )}
    </div>
  )
}
