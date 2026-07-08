'use client'

import Link from 'next/link'
import { ChevronRight, Loader2 } from 'lucide-react'
import { formatPrecio } from '@/lib/utils'
import { estadoLabel, estadoColor } from '@/lib/estadosPedido'
import { VolverAPedirButton } from './VolverAPedirButton'
import { useEditarBorrador } from './useEditarBorrador'

interface PedidoRowProps {
  pedido: {
    id: string
    numero: number
    estado: string
    medio_pago: string | null
    total_usd: number | null
    created_at: string
  }
  mostrarVolverAPedir: boolean
  background: string
  borderBottom: string
}

export function PedidoRow({ pedido: p, mostrarVolverAPedir, background, borderBottom }: PedidoRowProps) {
  const col = estadoColor(p.estado)
  const esBorrador = p.estado === 'borrador'
  const { editar, cargando, error } = useEditarBorrador(p.id, p.numero)

  const contenido = (
    <div className="flex items-center justify-between flex-1 min-w-0">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-mono" style={{ color: 'var(--color-acero-oscuro)' }}>
          #{p.numero}
        </span>
        <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
          {new Date(p.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm px-2.5 py-1 rounded-full" style={{ background: col.bg, color: col.text }}>
          {estadoLabel(p.estado)}
        </span>
        {p.total_usd != null && (
          <span className="text-base font-medium" style={{ color: 'var(--foreground)' }}>
            {formatPrecio(Number(p.total_usd))}
          </span>
        )}
      </div>
    </div>
  )

  if (esBorrador) {
    return (
      <div className="flex flex-col" style={{ background, borderBottom }}>
        <button
          type="button"
          onClick={editar}
          disabled={cargando}
          className="flex items-center px-5 py-4 gap-3 text-left transition-colors duration-100 hover:opacity-80 disabled:opacity-50"
        >
          {contenido}
          {cargando ? (
            <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-acero)' }} />
          ) : (
            <ChevronRight size={14} style={{ color: 'var(--color-acero)' }} />
          )}
        </button>
        {error && (
          <p className="text-xs px-5 pb-3" style={{ color: '#9a3412' }}>{error}</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center px-5 py-4 gap-3 transition-colors duration-100" style={{ background, borderBottom }}>
      <Link href={`/pedidos/${p.id}`} className="flex items-center justify-between flex-1 min-w-0">
        {contenido}
      </Link>
      {mostrarVolverAPedir && <VolverAPedirButton pedidoId={p.id} compact />}
      <Link href={`/pedidos/${p.id}`} aria-label={`Ver pedido #${p.numero}`}>
        <ChevronRight size={14} style={{ color: 'var(--color-acero)' }} />
      </Link>
    </div>
  )
}
