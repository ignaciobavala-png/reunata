'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, AlertTriangle, Check } from 'lucide-react'
import { cambiarEmailCliente } from '@/app/actions/clientes'

export function CambiarEmailForm({
  clienteId,
  emailActual,
  proveedores,
}: {
  clienteId: string
  emailActual: string | null
  proveedores: string[]
}) {
  const [abierto, setAbierto]   = useState(false)
  const [email, setEmail]       = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [listo, setListo]       = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Si entra con Google, cambiar el email de acceso no cambia con qué cuenta
  // de Google se loguea: eso lo maneja Google, no nosotros.
  const soloGoogle = proveedores.length > 0 && !proveedores.includes('email')

  function guardar() {
    setError(null)
    startTransition(async () => {
      const res = await cambiarEmailCliente(clienteId, email)
      if (res.error) { setError(res.error); return }
      setListo(true)
      setAbierto(false)
      setEmail('')
      router.refresh()
    })
  }

  if (!abierto) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setAbierto(true); setListo(false) }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors duration-150"
          style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--color-acero-oscuro)' }}
        >
          <Mail size={12} />
          Cambiar email
        </button>
        {listo && (
          <span className="inline-flex items-center gap-1 text-xs" style={{ color: '#10b981' }}>
            <Check size={12} />
            Email actualizado
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border p-4 flex flex-col gap-3" style={{ borderColor: 'var(--color-acero-claro)', background: 'var(--color-acero-brillo)' }}>
      <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
        Cambia el email de acceso y el de contacto a la vez. El cliente pasa a entrar con el
        email nuevo y la misma contraseña; el anterior ({emailActual ?? '—'}) deja de servir.
      </p>

      {soloGoogle && (
        <p className="inline-flex items-start gap-1.5 text-xs rounded-lg p-2" style={{ background: '#f59e0b22', color: '#854d0e' }}>
          <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
          <span>
            Esta cuenta entra con Google ({proveedores.join(', ')}). Cambiar el email acá no cambia
            con qué cuenta de Google se loguea: la persona nueva va a tener que entrar
            con &quot;Olvidé mi contraseña&quot; y armarse una propia.
          </span>
        </p>
      )}

      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="email.nuevo@empresa.com"
        autoFocus
        className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
        style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
      />

      {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={guardar}
          disabled={isPending || !email.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-opacity duration-150 disabled:opacity-50"
          style={{ background: 'var(--color-granito)', color: 'var(--color-acero-brillo)' }}
        >
          {isPending && <Loader2 size={12} className="animate-spin" />}
          Guardar email
        </button>
        <button
          onClick={() => { setAbierto(false); setError(null); setEmail('') }}
          disabled={isPending}
          className="px-3 py-1.5 text-xs rounded-lg border transition-colors duration-150 disabled:opacity-50"
          style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--color-acero-oscuro)' }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
