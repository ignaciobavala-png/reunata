'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { actualizarPerfil } from '@/app/actions/cuenta'

interface Profile {
  nombre?: string | null
  email?: string | null
  telefono?: string | null
  cuit_dni?: string | null
  condicion_fiscal?: string | null
}

const CONDICION_FISCAL = [
  'Consumidor Final',
  'Responsable Inscripto',
  'Monotributista',
  'Exento',
]

export function CuentaForm({ profile, userId }: { profile: Profile; userId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await actualizarPerfil(userId, formData)
      router.push('/dashboard/cliente/cuenta?guardado=1')
    })
  }

  const campo = (key: string, label: string, type = 'text', defaultVal?: string) => (
    <div>
      <label className="text-xs block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>{label}</label>
      <input
        name={key}
        type={type}
        defaultValue={defaultVal ?? ''}
        className="w-full px-3 py-2 text-xs rounded-lg border outline-none"
        style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)', background: 'white' }}
      />
    </div>
  )

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="rounded-xl border p-6 flex flex-col gap-4" style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}>
        <h2 className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-granito-claro)' }}>Contacto</h2>
        {campo('nombre',   'Nombre completo', 'text', profile.nombre ?? '')}
        {campo('email',    'Email',           'email', profile.email ?? '')}
        {campo('telefono', 'Teléfono / WhatsApp', 'tel', profile.telefono ?? '')}
      </div>

      <div className="rounded-xl border p-6 flex flex-col gap-4" style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}>
        <h2 className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-granito-claro)' }}>Facturación</h2>
        {campo('cuit_dni', 'CUIT / DNI', 'text', profile.cuit_dni ?? '')}
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>Condición fiscal</label>
          <select
            name="condicion_fiscal"
            defaultValue={profile.condicion_fiscal ?? ''}
            className="w-full px-3 py-2 text-xs rounded-lg border outline-none"
            style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)', background: 'white' }}
          >
            <option value="">Seleccioná tu condición</option>
            {CONDICION_FISCAL.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs disabled:opacity-60"
        style={{ background: 'var(--color-granito)', color: 'var(--color-acero-brillo)' }}
      >
        {isPending && <Loader2 size={13} className="animate-spin" />}
        Guardar cambios
      </button>
    </form>
  )
}
