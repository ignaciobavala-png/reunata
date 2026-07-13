'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Truck, RefreshCw, Printer, Store, Undo2 } from 'lucide-react'
import { generarEnvio, actualizarEstadoEnvio, marcarMetodoEnvio } from '@/app/actions/pedidos'

const ESTADO_LABEL: Record<string, string> = {
  sin_confirmar: 'Envío creado (sin confirmar)',
  en_proceso:    'Envío en proceso',
  procesado:     'Envío procesado — etiqueta lista',
}

export function GenerarEnvioButton({
  pedidoId,
  envioId,
  estado,
  tracking,
  metodoEnvio,
}: {
  pedidoId: string
  envioId: string | null
  estado: string | null
  tracking?: string | null
  metodoEnvio?: string | null
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleGenerar() {
    setError(null)
    startTransition(async () => {
      const res = await generarEnvio(pedidoId)
      if (res.ok) router.refresh()
      else setError(res.error ?? 'No se pudo generar el envío.')
    })
  }

  function handleActualizar() {
    setError(null)
    startTransition(async () => {
      const res = await actualizarEstadoEnvio(pedidoId)
      if (res.ok) router.refresh()
      else setError(res.error ?? 'No se pudo actualizar el estado.')
    })
  }

  function handleMetodo(metodo: 'interno' | null) {
    setError(null)
    startTransition(async () => {
      const res = await marcarMetodoEnvio(pedidoId, metodo)
      if (res.ok) router.refresh()
      else setError(res.error ?? 'No se pudo actualizar el método de envío.')
    })
  }

  // Ya marcado como envío interno: cartel + deshacer (no se generó en Enviopack)
  if (!envioId && metodoEnvio === 'interno') {
    return (
      <div className="flex flex-col gap-1.5 items-start">
        <p className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          <Store size={14} style={{ color: 'var(--color-acero-oscuro)' }} />
          Envío interno (moto / remís / local / otro correo)
        </p>
        <button
          type="button"
          onClick={() => handleMetodo(null)}
          disabled={pending}
          className="inline-flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70 disabled:opacity-50"
          style={{ color: 'var(--color-acero-oscuro)' }}
        >
          {pending ? <Loader2 size={12} className="animate-spin" /> : <Undo2 size={12} />}
          Deshacer / cambiar a Enviopack
        </button>
        {error && <p className="text-xs" style={{ color: '#dc2626' }}>{error}</p>}
      </div>
    )
  }

  // Sin envío todavía: generar en Enviopack — o — marcar como envío interno
  if (!envioId) {
    return (
      <div className="flex flex-col gap-2 items-start">
        <button
          type="button"
          onClick={handleGenerar}
          disabled={pending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors duration-150 disabled:opacity-50"
          style={{ background: 'var(--color-granito)', borderColor: 'transparent', color: 'var(--color-acero-brillo)' }}
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
          Generar envío en Enviopack
        </button>
        <button
          type="button"
          onClick={() => handleMetodo('interno')}
          disabled={pending}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-colors duration-150 disabled:opacity-50"
          style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)', background: 'white' }}
        >
          {pending ? <Loader2 size={12} className="animate-spin" /> : <Store size={12} />}
          Marcar como envío interno
        </button>
        {error && <p className="text-xs" style={{ color: '#dc2626' }}>{error}</p>}
      </div>
    )
  }

  const procesado = estado === 'procesado'

  return (
    <div className="flex flex-col gap-2 items-start">
      <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
        <span className="font-medium" style={{ color: procesado ? '#16a34a' : 'var(--foreground)' }}>
          {ESTADO_LABEL[estado ?? ''] ?? 'Envío generado'}
        </span>
        {' · '}Nº Enviopack: <span className="font-mono">{envioId}</span>
        {tracking && <>{' · '}Tracking: <span className="font-mono">{tracking}</span></>}
      </p>

      <div className="flex gap-2 flex-wrap items-center">
        {procesado ? (
          <a
            href={`/api/admin/pedidos/${pedidoId}/etiqueta`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors duration-150"
            style={{ background: 'var(--color-granito)', borderColor: 'transparent', color: 'var(--color-acero-brillo)' }}
          >
            <Printer size={14} />
            Imprimir etiqueta
          </a>
        ) : (
          <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
            La etiqueta estará disponible cuando el correo procese el envío.
          </p>
        )}
        <button
          type="button"
          onClick={handleActualizar}
          disabled={pending}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border transition-colors duration-150 disabled:opacity-50"
          style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)', background: 'white' }}
        >
          {pending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Actualizar estado
        </button>
      </div>
      {error && <p className="text-xs" style={{ color: '#dc2626' }}>{error}</p>}
    </div>
  )
}
