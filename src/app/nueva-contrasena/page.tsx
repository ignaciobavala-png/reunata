'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import Link from 'next/link'

export default function NuevaContrasenaPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [estado, setEstado] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    if (password.length < 8) {
      setErrorMsg('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirmar) {
      setErrorMsg('Las contraseñas no coinciden.')
      return
    }

    setEstado('loading')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setErrorMsg(error.message.includes('session') || error.message.includes('token')
        ? 'El link expiró. Solicitá uno nuevo desde la página de recuperación.'
        : 'No se pudo actualizar la contraseña. Intentá de nuevo.')
      setEstado('error')
    } else {
      setEstado('ok')
      setTimeout(() => router.push('/login'), 2500)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-granito-oscuro)' }}>
      <Header user={null} categorias={[]} />
      <main className="min-h-screen flex items-center justify-center px-6 pt-24 pb-16">
        <div className="w-full max-w-sm">
          <div className="mb-10">
            <h1 className="text-4xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-acero-brillo)' }}>
              Nueva contraseña
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-acero)' }}>
              {estado === 'ok'
                ? 'Contraseña actualizada. Te redirigimos al login…'
                : 'Elegí una contraseña nueva para tu cuenta.'}
            </p>
          </div>

          {estado === 'ok' ? (
            <div
              className="rounded-xl px-6 py-5 text-sm leading-relaxed"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-acero-claro)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              ¡Listo! Tu contraseña fue actualizada correctamente.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-acero)' }}>
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'var(--color-acero-brillo)',
                  }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-acero)' }}>
                  Confirmar contraseña
                </label>
                <input
                  type="password"
                  value={confirmar}
                  onChange={e => setConfirmar(e.target.value)}
                  required
                  placeholder="Repetí la contraseña"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'var(--color-acero-brillo)',
                  }}
                />
              </div>

              {(estado === 'error' || errorMsg) && (
                <p className="text-xs" style={{ color: '#f87171' }}>{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={estado === 'loading'}
                className="w-full py-3 rounded-xl text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: 'var(--color-acero-brillo)', color: 'var(--color-granito-oscuro)' }}
              >
                {estado === 'loading' ? 'Guardando…' : 'Guardar nueva contraseña'}
              </button>
            </form>
          )}

          <p className="text-center text-sm mt-6" style={{ color: 'var(--color-acero-oscuro)' }}>
            <Link href="/recuperar-contrasena" className="transition-opacity hover:opacity-80" style={{ color: 'var(--color-acero-claro)' }}>
              Solicitar nuevo link
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
