'use client'

import { useState, useTransition } from 'react'
import { MessageCircle, Calendar, CheckCheck, Loader2 } from 'lucide-react'
import { marcarContactado } from '@/app/actions/recontacto'

const ROL_LABEL: Record<string, string> = {
  distribuidor: 'Distribuidor',
  local: 'Local',
  mercha: 'Merchandising',
}

interface Cliente {
  id: string
  nombre: string | null
  email: string | null
  razon_social: string | null
  telefono: string | null
  rol: string
  ultima_compra_en: string | null
  created_at: string
  canales: { id: number; slug: string; nombre: string } | null
  canales_config: { marketing_mensaje_recontacto: string | null; marketing_link_agendamiento: string | null } | null
}

function ClienteRow({ c }: { c: Cliente }) {
  const [isPending, startTransition] = useTransition()
  const [contactado, setContactado] = useState(false)

  const display = c.razon_social ?? c.nombre ?? c.email ?? '—'
  const fechaUltimaCompra = c.ultima_compra_en
    ? new Date(c.ultima_compra_en).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
    : `Sin compras (alta: ${new Date(c.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })})`

  const mensaje = c.canales_config?.marketing_mensaje_recontacto
    ?.replace('{nombre}', c.nombre ?? display)
    ?? `Hola ${c.nombre ?? display}, hace un tiempo que no te vemos. ¿Necesitás algo?`

  const waLink = c.telefono
    ? `https://wa.me/${c.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`
    : null

  const agendaLink = c.canales_config?.marketing_link_agendamiento ?? null

  function handleContactado() {
    startTransition(async () => {
      const res = await marcarContactado(c.id)
      if (res.ok) setContactado(true)
    })
  }

  if (contactado) return null

  return (
    <div
      className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl border"
      style={{ borderColor: 'var(--color-acero-claro)', background: 'white' }}
    >
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{display}</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: 'var(--color-acero-brillo)', color: 'var(--color-acero-oscuro)' }}
          >
            {ROL_LABEL[c.rol] ?? c.rol}
          </span>
        </div>
        <p className="text-xs truncate" style={{ color: 'var(--color-acero-oscuro)' }}>
          {c.email}
          {c.telefono && <> · {c.telefono}</>}
        </p>
        <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
          Última compra: {fechaUltimaCompra}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {agendaLink && (
          <a
            href={agendaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors"
            style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}
          >
            <Calendar size={13} />
            Agendar
          </a>
        )}

        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg text-white transition-opacity"
            style={{ background: '#25d366' }}
          >
            <MessageCircle size={13} />
            WhatsApp
          </a>
        )}

        <button
          onClick={handleContactado}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors disabled:opacity-60"
          style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}
          title="Marcar como contactado"
        >
          {isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
          Contactado
        </button>
      </div>
    </div>
  )
}

export function RecontactoClient({ clientes }: { clientes: Cliente[] }) {
  if (clientes.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
          No hay clientes que requieran recontacto en este momento.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {clientes.map(c => <ClienteRow key={c.id} c={c} />)}
    </div>
  )
}
