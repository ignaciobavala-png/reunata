'use client'

import { useState } from 'react'
import { registrarse } from '@/app/actions/registro'
import { GoogleLoginButton } from '@/app/login/GoogleLoginButton'
import { Loader2 } from 'lucide-react'

type Tab = 'minorista' | 'mayorista'

const TIPOS_MAYORISTA = [
  { value: 'distribuidor', label: 'Distribuidor' },
  { value: 'local', label: 'Local' },
  { value: 'mercha', label: 'Merchandising' },
]

export function RegistroForm({ defaultTab = 'minorista', defaultTipo, next }: { defaultTab?: Tab; defaultTipo?: string; next?: string }) {
  const [tab, setTab] = useState<Tab>(defaultTab)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const inputClass = 'w-full rounded-md px-4 py-3 text-sm outline-none transition-colors duration-200'
  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(168,176,187,0.25)',
    color: 'var(--color-acero-brillo)',
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const form = e.currentTarget
    const data = new FormData(form)
    const password = data.get('password') as string
    const confirmar = data.get('confirmar_password') as string

    if (password !== confirmar) {
      setError('Las contraseñas no coinciden.')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setLoading(true)

    const rol = tab === 'minorista' ? 'consumidor_final' : (data.get('tipo') as string)

    const result = await registrarse({
      email: data.get('email') as string,
      password,
      nombre: data.get('nombre') as string,
      telefono: data.get('telefono') as string,
      rol,
      razon_social: data.get('razon_social') as string | undefined || undefined,
      cuit_dni: data.get('cuit_dni') as string,
      direccion: data.get('direccion') as string,
      localidad: data.get('localidad') as string,
      sitio_web: data.get('sitio_web') as string,
      puntos_venta: data.get('puntos_venta') ? Number(data.get('puntos_venta')) : undefined,
      next,
    })

    setLoading(false)

    if (result?.error) {
      setError(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Tabs */}
      <div className="flex rounded-md overflow-hidden border" style={{ borderColor: 'rgba(168,176,187,0.25)' }}>
        {(['minorista', 'mayorista'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); setError('') }}
            className="flex-1 py-3 text-xs tracking-widest uppercase transition-colors duration-200"
            style={{
              background: tab === t ? 'var(--color-acero-claro)' : 'transparent',
              color: tab === t ? 'var(--color-granito-oscuro)' : 'var(--color-acero-claro)',
            }}
          >
            {t === 'minorista' ? 'Minorista' : 'Mayorista'}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {/* Google OAuth — solo minoristas */}
      {tab === 'minorista' && (
        <>
          <GoogleLoginButton next={next} />
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(168,176,187,0.2)' }} />
            <span className="text-xs" style={{ color: 'var(--color-acero-claro)', opacity: 0.6 }}>o registrate con email</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(168,176,187,0.2)' }} />
          </div>
        </>
      )}

      {/* Minorista fields */}
      {tab === 'minorista' && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-acero-claro)' }}>Nombre de usuario</label>
            <input name="nombre" required className={inputClass} style={inputStyle} placeholder="Tu nombre" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-acero-claro)' }}>WhatsApp</label>
            <input name="telefono" type="tel" className={inputClass} style={inputStyle} placeholder="+54 9 11 1234-5678" />
          </div>
        </>
      )}

      {/* Mayorista fields */}
      {tab === 'mayorista' && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-acero-claro)' }}>Tipo de cliente</label>
            <select name="tipo" required defaultValue={defaultTipo ?? ''} className={inputClass} style={inputStyle}>
              <option value="" disabled className="text-sm" style={{ background: '#1a1a1a', color: '#ccc' }}>Seleccioná un tipo</option>
              {TIPOS_MAYORISTA.map(t => (
                <option key={t.value} value={t.value} className="text-sm" style={{ background: '#1a1a1a', color: '#ccc' }}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-acero-claro)' }}>CUIT / DNI</label>
            <input name="cuit_dni" required className={inputClass} style={inputStyle} placeholder="XX-XXXXXXXX-X" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-acero-claro)' }}>Razón social / Nombre del negocio</label>
            <input name="razon_social" required className={inputClass} style={inputStyle} placeholder="Mi Empresa S.A." />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-acero-claro)' }}>Nombre y Apellido del contacto</label>
            <input name="nombre" required className={inputClass} style={inputStyle} placeholder="Nombre del contacto" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-acero-claro)' }}>Dirección del comercio</label>
            <input name="direccion" required className={inputClass} style={inputStyle} placeholder="Calle, número, piso" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-acero-claro)' }}>Localidad</label>
              <input name="localidad" required className={inputClass} style={inputStyle} placeholder="Ciudad" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-acero-claro)' }}>WhatsApp</label>
              <input name="telefono" required className={inputClass} style={inputStyle} placeholder="+54 9 11 1234-5678" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-acero-claro)' }}>Sitio web / Red social</label>
            <input name="sitio_web" className={inputClass} style={inputStyle} placeholder="https://..." />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-acero-claro)' }}>Puntos de venta</label>
            <input name="puntos_venta" type="number" min="0" className={inputClass} style={inputStyle} placeholder="0" />
          </div>
        </>
      )}

      {/* Shared fields */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-acero-claro)' }}>Email</label>
        <input name="email" type="email" required autoComplete="email" className={inputClass} style={inputStyle} placeholder="tu@email.com" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-acero-claro)' }}>Contraseña</label>
          <input name="password" type="password" required autoComplete="new-password" className={inputClass} style={inputStyle} placeholder="••••••••" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-acero-claro)' }}>Confirmar</label>
          <input name="confirmar_password" type="password" required autoComplete="new-password" className={inputClass} style={inputStyle} placeholder="••••••••" />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-2 w-full text-xs tracking-widest uppercase py-3.5 rounded-md transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
        style={{ background: 'var(--color-acero-claro)', color: 'var(--color-granito-oscuro)' }}
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {tab === 'minorista' ? 'Crear cuenta minorista' : 'Crear cuenta mayorista'}
      </button>
    </form>
  )
}
