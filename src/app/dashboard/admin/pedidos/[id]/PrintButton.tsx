'use client'

import { Printer, Truck, ClipboardList } from 'lucide-react'

function triggerPrint(mode?: 'envio' | 'armado') {
  if (mode) document.body.classList.add(`print-${mode}`)
  window.print()
  if (mode) document.body.classList.remove(`print-${mode}`)
}

export function PrintButton() {
  return (
    <div className="print:hidden flex items-center gap-2">
      <button
        onClick={() => triggerPrint()}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-opacity hover:opacity-70"
        style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)', background: 'white' }}
      >
        <Printer size={14} />
        Imprimir pedido
      </button>
      <button
        onClick={() => triggerPrint('envio')}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-opacity hover:opacity-70"
        style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)', background: 'white' }}
      >
        <Truck size={14} />
        Imprimir envío
      </button>
      <button
        onClick={() => triggerPrint('armado')}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-opacity hover:opacity-70"
        style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)', background: 'white' }}
        title="Lista sin precios para armar y despachar"
      >
        <ClipboardList size={14} />
        Imprimir armado
      </button>
    </div>
  )
}
