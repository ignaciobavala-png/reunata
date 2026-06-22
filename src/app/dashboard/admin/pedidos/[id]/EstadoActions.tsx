'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { actualizarEstadoPedido } from '@/app/actions/pedidos'
import { Loader2 } from 'lucide-react'

const TRANSICIONES: Record<string, { label: string; estado: string; danger?: boolean }[]> = {
  borrador:           [
    { label: 'Confirmar pedido', estado: 'pendiente_pago' },
    { label: 'Cancelar pedido',  estado: 'cancelado', danger: true },
  ],
  pendiente_pago:     [
    { label: 'Confirmar pago',   estado: 'pago_confirmado' },
    { label: 'Cancelar pedido',  estado: 'cancelado', danger: true },
  ],
  comprobante_subido: [
    { label: 'Confirmar pago',   estado: 'pago_confirmado' },
    { label: 'Cancelar pedido',  estado: 'cancelado', danger: true },
  ],
  pago_confirmado:    [{ label: 'Pasar a preparación', estado: 'en_preparacion' }],
  en_preparacion:     [{ label: 'Marcar como enviado', estado: 'enviado' }],
  enviado:            [{ label: 'Marcar como entregado', estado: 'entregado' }],
}

export function EstadoActions({ pedidoId, estadoActual }: { pedidoId: string; estadoActual: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const opciones = TRANSICIONES[estadoActual] ?? []

  if (!opciones.length) return null

  function avanzar(nuevoEstado: string) {
    startTransition(async () => {
      await actualizarEstadoPedido(pedidoId, nuevoEstado)
      router.refresh()
    })
  }

  return (
    <div className="flex gap-2 flex-wrap items-center">
      {pending && <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-acero-oscuro)' }} />}
      {opciones.map(op => (
        <button
          key={op.estado}
          onClick={() => avanzar(op.estado)}
          disabled={pending}
          className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors duration-150 disabled:opacity-50"
          style={op.danger
            ? { background: '#ef444415', borderColor: '#ef4444', color: '#ef4444' }
            : { background: 'var(--color-granito)', borderColor: 'transparent', color: 'var(--color-acero-brillo)' }
          }
        >
          {op.label}
        </button>
      ))}
    </div>
  )
}
