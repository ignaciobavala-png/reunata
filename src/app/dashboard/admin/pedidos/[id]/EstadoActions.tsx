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
  sena_confirmada:    [
    { label: 'Confirmar saldo / pago final', estado: 'pago_confirmado' },
    { label: 'Cancelar pedido',              estado: 'cancelado', danger: true },
  ],
  pago_confirmado:    [{ label: 'Pasar a preparación', estado: 'en_preparacion' }],
  en_preparacion:     [{ label: 'Marcar como enviado', estado: 'enviado' }],
  enviado:            [{ label: 'Marcar como entregado', estado: 'entregado' }],
}

export function EstadoActions({ pedidoId, estadoActual, medioPago }: { pedidoId: string; estadoActual: string; medioPago?: string | null }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const base = TRANSICIONES[estadoActual] ?? []
  // La seña solo tiene sentido para efectivo, y solo antes de confirmar el pago completo.
  const ofreceSena = medioPago === 'efectivo' && ['pendiente_pago', 'comprobante_subido'].includes(estadoActual)
  const opciones = ofreceSena
    ? [{ label: 'Confirmar seña (10%)', estado: 'sena_confirmada' }, ...base]
    : base

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
