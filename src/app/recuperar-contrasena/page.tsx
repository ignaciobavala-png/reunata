'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import Link from 'next/link'

export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState('')
  const [estado, setEstado] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setEstado('loading')
    setErrorMsg('')

    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=/nueva-contrasena`

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo })

    if (error) {
      setErrorMsg('No se pudo enviar el email. Verificá la dirección e intentá de nuevo.')
      setEstado('error')
    } else {
      setEstado('sent')
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-granito-oscuro)' }}>
      <Header user={null} categorias={[]} />
      <main className="min-h-screen flex items-center justify-center px-6 pt-24 pb-16">
        <div className="w-full max-w-sm">
          <div className="mb-10">
            <h1 className="text-4xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-acero-brillo)' }}>
              Recuperar contraseña
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-acero)' }}>
              {estado === 'sent'
                ? 'Revisá tu bandeja de entrada.'
                : 'Ingresá tu email y te enviamos un link para restablecer tu contraseña.'}
            </p>
          </div>

          {estado === 'sent' ? (
            <div
              className="rounded-xl px-6 py-5 mb-8 text-sm leading-relaxed"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-acero-claro)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Te enviamos un email a <strong>{email}</strong> con el link para restablecer tu contraseña. El link expira en 1 hora.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-acero)' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="tu@email.com"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'var(--color-acero-brillo)',
                  }}
                />
              </div>

              {estado === 'error' && (
                <p className="text-xs" style={{ color: '#f87171' }}>{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={estado === 'loading'}
                className="w-full py-3 rounded-xl text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: 'var(--color-acero-brillo)', color: 'var(--color-granito-oscuro)' }}
              >
                {estado === 'loading' ? 'Enviando…' : 'Enviar link de recuperación'}
              </button>
            </form>
          )}

          <p className="text-center text-sm mt-6" style={{ color: 'var(--color-acero-oscuro)' }}>
            ¿Recordaste la contraseña?{' '}
            <Link href="/login" className="transition-opacity hover:opacity-80" style={{ color: 'var(--color-acero-claro)' }}>
              Ingresá acá
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
