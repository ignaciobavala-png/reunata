'use client'

import { Loader2, Pencil } from 'lucide-react'
import { useEditarBorrador } from './useEditarBorrador'

// Lleva un pedido en estado "borrador" al carrito para editarlo. A diferencia
// de "Volver a pedir", esto REEMPLAZA el carrito actual y queda atado al
// pedido original: al confirmar en /carrito se actualiza ese mismo pedido
// (mismo número) en vez de crear uno nuevo.
export function EditarBorradorButton({ pedidoId, numero }: { pedidoId: string; numero: number }) {
  const { editar, cargando, error } = useEditarBorrador(pedidoId, numero)

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={editar}
        disabled={cargando}
        className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm border transition-colors hover:opacity-80 disabled:opacity-50"
        style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-granito-oscuro)', background: 'white' }}
      >
        {cargando ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
        Editar pedido
      </button>
      {error && (
        <p className="text-xs" style={{ color: '#9a3412' }}>{error}</p>
      )}
    </div>
  )
}
