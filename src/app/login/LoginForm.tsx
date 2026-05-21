'use client'

import { useFormStatus } from 'react-dom'
import { login } from '@/app/actions/auth'
import Link from 'next/link'
import { GoogleLoginButton } from './GoogleLoginButton'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full text-xs tracking-widest uppercase py-3.5 rounded-md transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70"
      style={{ background: 'var(--color-acero-claro)', color: 'var(--color-granito-oscuro)' }}
    >
      {pending && (
        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {pending ? 'Ingresando…' : 'Ingresar'}
    </button>
  )
}

export function LoginForm({ error, next }: { error?: string; next?: string }) {
  return (
    <>
      {error === 'credenciales_invalidas' && (
        <div className="mb-5 px-4 py-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}>
          Email o contraseña incorrectos.
        </div>
      )}

      <form action={login} className="flex flex-col gap-5">
        {next && <input type="hidden" name="next" value={next} />}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-acero-claro)' }}>
            Email
          </label>
          <input
            id="email" name="email" type="email" autoComplete="email" required placeholder="tu@email.com"
            className="w-full rounded-md px-4 py-3 text-sm outline-none transition-colors duration-200"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(168,176,187,0.25)', color: 'var(--color-acero-brillo)' }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-acero-claro)' }}>
              Contraseña
            </label>
            <Link href="/recuperar-contrasena" className="text-xs transition-colors duration-200 hover:opacity-80" style={{ color: 'var(--color-acero)' }}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <input
            id="password" name="password" type="password" autoComplete="current-password" required placeholder="••••••••"
            className="w-full rounded-md px-4 py-3 text-sm outline-none transition-colors duration-200"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(168,176,187,0.25)', color: 'var(--color-acero-brillo)' }}
          />
        </div>

        <SubmitButton />
      </form>

      <div className="my-6 flex items-center gap-4">
        <div className="flex-1 h-px" style={{ background: 'rgba(168,176,187,0.2)' }} />
        <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>o continuá con</span>
        <div className="flex-1 h-px" style={{ background: 'rgba(168,176,187,0.2)' }} />
      </div>

      <GoogleLoginButton next={next} />

      <div className="my-6 flex items-center gap-4">
        <div className="flex-1 h-px" style={{ background: 'rgba(168,176,187,0.2)' }} />
        <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>¿Sos nuevo?</span>
        <div className="flex-1 h-px" style={{ background: 'rgba(168,176,187,0.2)' }} />
      </div>

      <Link
        href="/registro"
        className="block w-full text-center text-xs tracking-widest uppercase py-3.5 rounded-md transition-colors duration-200 hover:opacity-80"
        style={{ border: '1px solid rgba(168,176,187,0.35)', color: 'var(--color-acero-claro)' }}
      >
        Crear cuenta
      </Link>
    </>
  )
}
