'use client'

import { useState } from 'react'
import { Copy, Check, MessageCircle } from 'lucide-react'
import { formatPrecio } from '@/lib/utils'

const METODOS = [
  { key: 'transferencia_blanco', label: 'Transferencia' },
  { key: 'efectivo',             label: 'Efectivo' },
  { key: 'echeq',               label: 'E-cheq' },
  { key: 'cheque_fisico',       label: 'Cheque' },
]

function Copiable({ value, label }: { value: string; label: string }) {
  const [copiado, setCopiado] = useState(false)
  function copiar() {
    navigator.clipboard.writeText(value)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1500)
  }
  return (
    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--color-acero-claro)' }}>
      <div>
        <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>{label}</p>
        <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--foreground)' }}>{value || '—'}</p>
      </div>
      {value && (
        <button onClick={copiar} className="p-1.5 rounded transition-colors duration-150" style={{ color: copiado ? '#10b981' : 'var(--color-acero)' }}>
          {copiado ? <Check size={13} /> : <Copy size={13} />}
        </button>
      )}
    </div>
  )
}

export function PagoInstrucciones({
  pedidoId,
  total,
  cfg,
  estado,
}: {
  pedidoId: string
  total: number
  cfg: Record<string, string>
  estado: string
}) {
  const [metodo, setMetodo] = useState('transferencia_blanco')
  const ref = pedidoId.slice(-8).toUpperCase()

  const waText = encodeURIComponent(
    `Hola Reunata! Quiero avisar que pagué el pedido #${ref} por ${formatPrecio(total)}. Medio: ${metodo.replace('_', ' ')}.`
  )
  const waLink = `https://wa.me/549${cfg['whatsapp_ventas'] ?? ''}?text=${waText}`

  return (
    <div className="rounded-xl border p-5 mb-6" style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}>
      <h2 className="text-base font-medium mb-4" style={{ color: 'var(--foreground)' }}>
        {estado === 'comprobante_subido' ? '✓ Comprobante recibido — instrucciones de pago' : 'Instrucciones de pago'}
      </h2>

      {/* Tabs de método */}
      <div className="flex gap-1 mb-5 flex-wrap">
        {METODOS.map(m => (
          <button
            key={m.key}
            onClick={() => setMetodo(m.key)}
            className="px-3 py-1.5 rounded-lg text-sm border transition-colors duration-150"
            style={{
              borderColor: metodo === m.key ? 'var(--color-granito)' : 'var(--color-acero-claro)',
              background: metodo === m.key ? 'var(--color-granito)' : 'white',
              color: metodo === m.key ? 'var(--color-acero-brillo)' : 'var(--color-acero-oscuro)',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Contenido por método */}
      {metodo === 'transferencia_blanco' && (
        <div>
          <Copiable label="CBU"           value={cfg['banco_cbu'] ?? ''} />
          <Copiable label="Alias"         value={cfg['banco_alias'] ?? ''} />
          <Copiable label="Banco"         value={cfg['banco_nombre'] ?? ''} />
          <Copiable label="Titular"       value={cfg['banco_razon_social'] ?? ''} />
          <Copiable label="CUIT"          value={cfg['banco_cuit'] ?? ''} />
          <Copiable label="Monto exacto"  value={formatPrecio(total)} />
          <Copiable label="Referencia"    value={`Pedido #${ref}`} />
        </div>
      )}

      {metodo === 'efectivo' && (
        <p className="text-sm py-4" style={{ color: 'var(--color-acero-oscuro)' }}>
          Coordiná la entrega del efectivo con tu vendedor. Monto: <strong>{formatPrecio(total)}</strong>
        </p>
      )}

      {metodo === 'echeq' && (
        <div>
          <Copiable label="A nombre de" value={cfg['banco_razon_social'] ?? ''} />
          <Copiable label="CUIT"        value={cfg['banco_cuit'] ?? ''} />
          <Copiable label="Monto"       value={formatPrecio(total)} />
          <p className="text-sm mt-3" style={{ color: 'var(--color-acero-oscuro)' }}>
            Emití el e-cheq a nombre de Reunata y coordiná el envío con tu vendedor.
          </p>
        </div>
      )}

      {metodo === 'cheque_fisico' && (
        <div>
          <Copiable label="A la orden de" value={cfg['banco_razon_social'] ?? ''} />
          <Copiable label="CUIT"          value={cfg['banco_cuit'] ?? ''} />
          <Copiable label="Monto"         value={formatPrecio(total)} />
          <p className="text-sm mt-3" style={{ color: 'var(--color-acero-oscuro)' }}>
            El cheque debe llegar a Reunata antes de que procesemos tu pedido. Coordiná el envío con tu vendedor.
          </p>
        </div>
      )}

      {/* Botón WhatsApp */}
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 flex items-center gap-2 w-full justify-center py-2.5 rounded-lg text-sm transition-colors duration-150"
        style={{ background: '#25D36622', color: '#25D366', border: '1px solid #25D36644' }}
      >
        <MessageCircle size={14} />
        Avisar por WhatsApp que pagué
      </a>
    </div>
  )
}
