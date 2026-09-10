'use client'

import { Ship, FileText, PackageCheck, Clock } from 'lucide-react'
import Link from 'next/link'
import { formatPrecio } from '@/lib/utils'
import { capitalizeVariante, getSwatchStyle } from '@/components/sections/ColorPicker'
import {
  ETAPA_LABEL,
  ETAPA_COLOR,
  formatFechaEstimada,
  type EtapaContainer,
} from '@/lib/containers'

export interface ItemReservaCliente {
  codigo: string
  titulo: string
  variante: string | null
  cantidad: number
  precioUnit: number
}

export interface ReservaCliente {
  id: string
  /** Número visible, serie propia. No confundir con el número de pedido. */
  numero: number
  viaje: string
  etapaViaje: EtapaContainer
  fechaArribo: string | null
  etapaCompra: EtapaContainer
  descuentoPct: number
  total: number | null
  moneda: string | null
  estado: 'solicitada' | 'confirmada' | 'cancelada'
  facturada: boolean
  entregada: boolean
  creada: string
  items: ItemReservaCliente[]
}

const ESTADO_LABEL: Record<ReservaCliente['estado'], string> = {
  solicitada: 'Pendiente de confirmar',
  confirmada: 'Confirmada',
  cancelada:  'Cancelada',
}

export function ReservasClient({
  reservas,
  esMayorista,
}: {
  reservas: ReservaCliente[]
  esMayorista: boolean
}) {
  const vivas = reservas.filter(r => r.estado !== 'cancelada')

  // Los tres totales van separados a propósito: acá se factura mercadería por venir,
  // así que "lo que debo" y "lo que ya recibí" no son el mismo número en ningún
  // momento del viaje.
  const comprometido = vivas.reduce((a, r) => a + (r.total ?? 0), 0)
  const facturado = vivas.filter(r => r.facturada).reduce((a, r) => a + (r.total ?? 0), 0)
  const entregado = vivas.filter(r => r.entregada).reduce((a, r) => a + (r.total ?? 0), 0)
  const moneda = vivas.find(r => r.moneda)?.moneda ?? null

  if (reservas.length === 0) {
    return (
      <div className="py-12 text-center">
        <Ship size={28} strokeWidth={1.2} style={{ color: 'var(--color-acero-claro)' }} className="mx-auto mb-3" aria-hidden="true" />
        <p className="text-sm mb-1" style={{ color: 'var(--foreground)' }}>
          Todavía no reservaste nada de preventa.
        </p>
        <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
          Buscá el ⛴ en las fotos de la{' '}
          <Link href="/tienda" className="underline">tienda</Link> para ver qué viene en camino.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Total icono={<Clock size={14} aria-hidden="true" />} label="Comprometido" valor={comprometido} moneda={moneda} destacado />
        <Total icono={<FileText size={14} aria-hidden="true" />} label="Ya facturado" valor={facturado} moneda={moneda} />
        <Total icono={<PackageCheck size={14} aria-hidden="true" />} label="Ya entregado" valor={entregado} moneda={moneda} />
      </div>

      <p className="text-xs -mt-4" style={{ color: 'var(--color-acero-oscuro)' }}>
        {esMayorista ? 'Los importes se muestran sin impuestos nacionales. ' : ''}
        La mercadería se factura antes de llegar, así que lo facturado y lo entregado
        no coinciden hasta el final del viaje.
      </p>

      {reservas.map(reserva => {
        const fecha = formatFechaEstimada(reserva.fechaArribo)
        return (
          <div
            key={reserva.id}
            className="rounded-lg p-4"
            style={{
              border: '1px solid var(--color-acero-claro)',
              opacity: reserva.estado === 'cancelada' ? 0.55 : 1,
            }}
          >
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: ETAPA_COLOR[reserva.etapaViaje] }}
                aria-hidden="true"
              />
              <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                {reserva.viaje}
              </span>
              <span className="text-xs font-mono" style={{ color: 'var(--color-acero-oscuro)' }}>
                Preventa #{reserva.numero}
              </span>
              <span className="text-xs" style={{ color: ETAPA_COLOR[reserva.etapaViaje] }}>
                {ETAPA_LABEL[reserva.etapaViaje]}
              </span>
              <span className="text-xs ml-auto" style={{ color: 'var(--color-acero-oscuro)' }}>
                {ESTADO_LABEL[reserva.estado]}
              </span>
            </div>

            <p className="text-xs mb-3" style={{ color: 'var(--color-acero-oscuro)' }}>
              {fecha ? `Llega aprox. ${fecha}` : 'Fecha de llegada a confirmar'}
              {reserva.descuentoPct > 0 && ` · reservado en ${ETAPA_LABEL[reserva.etapaCompra].toLowerCase()} con −${reserva.descuentoPct}%`}
            </p>

            <div className="flex flex-col gap-1.5">
              {reserva.items.map((item, i) => (
                <div key={`${item.codigo}-${item.variante}-${i}`} className="flex items-center gap-2 text-xs">
                  {item.variante && (
                    <span
                      className="inline-block rounded flex-shrink-0"
                      style={{ width: 14, height: 14, ...getSwatchStyle(item.variante), border: '1px solid rgba(0,0,0,0.12)' }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="min-w-0 flex-1 truncate" style={{ color: 'var(--foreground)' }}>
                    {item.titulo}
                    {item.variante && (
                      <span style={{ color: 'var(--color-acero-oscuro)' }}> · {capitalizeVariante(item.variante)}</span>
                    )}
                  </span>
                  <span className="tabular-nums flex-shrink-0" style={{ color: 'var(--color-acero-oscuro)' }}>
                    {item.cantidad} × {formatPrecio(item.precioUnit, reserva.moneda)}
                  </span>
                </div>
              ))}
            </div>

            <div
              className="flex flex-wrap items-center gap-3 mt-3 pt-3"
              style={{ borderTop: '1px solid var(--color-acero-claro)' }}
            >
              <Hito hecho={reserva.facturada} label="Facturada" />
              <Hito hecho={reserva.entregada} label="Entregada" />
              {reserva.total != null && (
                <span className="ml-auto text-sm font-medium tabular-nums" style={{ color: 'var(--foreground)' }}>
                  {formatPrecio(reserva.total, reserva.moneda)}
                </span>
              )}
            </div>
          </div>
        )
      })}

      <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
        ¿Necesitás cambiar o cancelar una reserva? Escribinos desde{' '}
        <Link href="/contacto" className="underline">contacto</Link> y lo vemos.
      </p>
    </div>
  )
}

function Total({
  icono,
  label,
  valor,
  moneda,
  destacado = false,
}: {
  icono: React.ReactNode
  label: string
  valor: number
  moneda: string | null
  destacado?: boolean
}) {
  return (
    <div
      className="rounded-lg px-4 py-3"
      style={{
        border: '1px solid var(--color-acero-claro)',
        background: destacado ? 'var(--color-acero-brillo)' : 'transparent',
      }}
    >
      <span className="flex items-center gap-1.5 text-xs mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>
        {icono}
        {label}
      </span>
      <span className="text-lg font-medium tabular-nums" style={{ color: 'var(--foreground)' }}>
        {formatPrecio(valor, moneda)}
      </span>
    </div>
  )
}

function Hito({ hecho, label }: { hecho: boolean; label: string }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded"
      style={{
        background: hecho ? '#10b98118' : 'transparent',
        color: hecho ? '#10b981' : 'var(--color-acero-oscuro)',
        border: `1px solid ${hecho ? '#10b98144' : 'var(--color-acero-claro)'}`,
      }}
    >
      {hecho ? `✓ ${label}` : label}
    </span>
  )
}
