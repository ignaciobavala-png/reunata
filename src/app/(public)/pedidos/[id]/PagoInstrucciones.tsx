'use client'

import { useState } from 'react'
import { Copy, Check, MessageCircle } from 'lucide-react'
import { formatPrecio } from '@/lib/utils'

// Bloques de instrucciones por medio de pago del pedido (valores de pedidos.medio_pago)
type Bloque = 'banco' | 'cuenta_sin_iva' | 'efectivo' | 'echeq' | 'cheque' | 'mercadopago'

const MEDIO_A_BLOQUE: Record<string, Bloque> = {
  transferencia:            'banco',
  transferencia_blanco:     'banco',
  transferencia_cueva:      'cuenta_sin_iva',
  efectivo:                 'efectivo',
  echeq_propio:             'echeq',
  echeq_al_dia:             'echeq',
  echeq_tercero:            'echeq',
  cheque_fisico_al_dia:     'cheque',
  cheque_fisico_financiado: 'cheque',
  mercadopago:              'mercadopago',
}

const BLOQUE_LABEL: Record<Bloque, string> = {
  banco:          'Transferencia',
  cuenta_sin_iva: 'Transferencia',
  efectivo:       'Efectivo',
  echeq:          'E-cheq',
  cheque:         'Cheque',
  mercadopago:    'Mercado Pago',
}

export interface CuentaSinIva {
  tipo: string
  cbu: string
  alias?: string | null
  cuit?: string | null
  banco?: string | null
}

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
  numero,
  total,
  costoEnvio,
  cfg,
  estado,
  medioPago,
  cuentaSinIva,
}: {
  numero: number
  total: number
  costoEnvio?: number
  cfg: Record<string, string>
  estado: string
  /** pedidos.medio_pago — se muestran solo los datos del método elegido en la compra */
  medioPago?: string | null
  /** Cuenta del canal para transferencia sin IVA (transferencia_cueva) */
  cuentaSinIva?: CuentaSinIva | null
}) {
  const bloqueElegido: Bloque | null = medioPago ? (MEDIO_A_BLOQUE[medioPago] ?? null) : null
  // Pedidos viejos sin medio de pago registrado: se mantiene el selector como fallback
  const [metodoManual, setMetodoManual] = useState<Bloque>('banco')
  const bloque = bloqueElegido ?? metodoManual

  const ref = String(numero)
  const waText = encodeURIComponent(
    `Hola Reunata! Quiero avisar que pagué el pedido #${ref} por ${formatPrecio(total)}. Medio: ${BLOQUE_LABEL[bloque].toLowerCase()}.`
  )
  const waLink = `https://wa.me/549${cfg['whatsapp_ventas'] ?? ''}?text=${waText}`

  const montos = costoEnvio && costoEnvio > 0 ? (
    <>
      <Copiable label="Subtotal productos" value={formatPrecio(total - costoEnvio)} />
      <Copiable label="Envío"              value={formatPrecio(costoEnvio)} />
      <Copiable label="Monto exacto"       value={formatPrecio(total)} />
    </>
  ) : (
    <Copiable label="Monto exacto" value={formatPrecio(total)} />
  )

  return (
    <div className="rounded-xl border p-5 mb-6" style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}>
      <h2 className="text-base font-medium mb-4" style={{ color: 'var(--foreground)' }}>
        {estado === 'comprobante_subido' ? '✓ Comprobante recibido — instrucciones de pago' : 'Instrucciones de pago'}
      </h2>

      {bloqueElegido ? (
        <p className="text-sm mb-4 px-3 py-2 rounded-lg" style={{ background: 'var(--color-acero-brillo)', color: 'var(--color-acero-oscuro)' }}>
          Forma de pago elegida: <span className="font-medium" style={{ color: 'var(--foreground)' }}>{BLOQUE_LABEL[bloqueElegido]}</span>
        </p>
      ) : (
        <div className="flex gap-1 mb-5 flex-wrap">
          {(['banco', 'efectivo', 'echeq', 'cheque'] as Bloque[]).map(b => (
            <button
              key={b}
              onClick={() => setMetodoManual(b)}
              className="px-3 py-1.5 rounded-lg text-sm border transition-colors duration-150"
              style={{
                borderColor: metodoManual === b ? 'var(--color-granito)' : 'var(--color-acero-claro)',
                background: metodoManual === b ? 'var(--color-granito)' : 'white',
                color: metodoManual === b ? 'var(--color-acero-brillo)' : 'var(--color-acero-oscuro)',
              }}
            >
              {BLOQUE_LABEL[b]}
            </button>
          ))}
        </div>
      )}

      {bloque === 'banco' && (
        <div>
          <Copiable label="CBU"     value={cfg['banco_cbu'] ?? ''} />
          <Copiable label="Alias"   value={cfg['banco_alias'] ?? ''} />
          <Copiable label="Banco"   value={cfg['banco_nombre'] ?? ''} />
          <Copiable label="Titular" value={cfg['banco_razon_social'] ?? ''} />
          <Copiable label="CUIT"    value={cfg['banco_cuit'] ?? ''} />
          {montos}
          <Copiable label="Referencia" value={`Pedido #${ref}`} />
        </div>
      )}

      {bloque === 'cuenta_sin_iva' && (
        cuentaSinIva?.cbu ? (
          <div>
            {cuentaSinIva.tipo === 'deposito' ? (
              <>
                {cuentaSinIva.banco && <Copiable label="Banco" value={cuentaSinIva.banco} />}
                {cuentaSinIva.cuit && <Copiable label="CUIT" value={cuentaSinIva.cuit} />}
                <Copiable label="CTA/CTE" value={cuentaSinIva.cbu} />
              </>
            ) : (
              <>
                <Copiable label={cuentaSinIva.tipo || 'CBU'} value={cuentaSinIva.cbu} />
                {cuentaSinIva.alias && <Copiable label="Alias" value={cuentaSinIva.alias} />}
                {cuentaSinIva.banco && <Copiable label="Banco" value={cuentaSinIva.banco} />}
                {cuentaSinIva.cuit && <Copiable label="CUIT" value={cuentaSinIva.cuit} />}
              </>
            )}
            {montos}
            <Copiable label="Referencia" value={`Pedido #${ref}`} />
          </div>
        ) : (
          <p className="text-sm py-4" style={{ color: 'var(--color-acero-oscuro)' }}>
            Coordiná los datos de la transferencia con tu vendedor. Monto: <strong>{formatPrecio(total)}</strong>
          </p>
        )
      )}

      {bloque === 'efectivo' && (
        <p className="text-sm py-4" style={{ color: 'var(--color-acero-oscuro)' }}>
          Coordiná la entrega del efectivo con tu vendedor. Monto: <strong>{formatPrecio(total)}</strong>
        </p>
      )}

      {bloque === 'echeq' && (
        <div>
          <Copiable label="A nombre de" value={cfg['banco_razon_social'] ?? ''} />
          <Copiable label="CUIT"        value={cfg['banco_cuit'] ?? ''} />
          <Copiable label="Monto"       value={formatPrecio(total)} />
          <p className="text-sm mt-3" style={{ color: 'var(--color-acero-oscuro)' }}>
            Emití el e-cheq a nombre de Reunata y coordiná el envío con tu vendedor.
          </p>
        </div>
      )}

      {bloque === 'cheque' && (
        <div>
          <Copiable label="A la orden de" value={cfg['banco_razon_social'] ?? ''} />
          <Copiable label="CUIT"          value={cfg['banco_cuit'] ?? ''} />
          <Copiable label="Monto"         value={formatPrecio(total)} />
          <p className="text-sm mt-3" style={{ color: 'var(--color-acero-oscuro)' }}>
            El cheque debe llegar a Reunata antes de que procesemos tu pedido. Coordiná el envío con tu vendedor.
          </p>
        </div>
      )}

      {bloque === 'mercadopago' && (
        <p className="text-sm py-4" style={{ color: 'var(--color-acero-oscuro)' }}>
          Este pedido se paga a través de Mercado Pago. Si no completaste el pago,
          volvé a intentarlo desde el carrito o contactanos por WhatsApp.
        </p>
      )}

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
