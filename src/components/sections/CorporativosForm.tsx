'use client'

import { useState } from 'react'
import { crearCorporativo } from '@/app/actions/corporativos'

const ocasiones = [
  'Tu equipo de trabajo',
  'Un Evento',
  'Regalos para clientes',
  'Sos empresa de Mercha',
  'Otro',
]

const productos = [
  'Mates',
  'Mochilas',
  'Termos',
  'Todos',
]

const personalizarOptions = ['Sí', 'No']

function Field({ label, name, type = 'text', required = true, placeholder }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-granito-oscuro)' }}>
        {label}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-base rounded-lg border-2 outline-none transition-colors duration-150 focus:border-[var(--color-acero-brillo)] shadow-inner"
        style={{
          borderColor: 'var(--color-granito-claro)',
          background: 'var(--color-granito)',
          color: 'var(--color-acero-brillo)',
        }}
      />
    </div>
  )
}

export function CorporativosForm() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [personalizar, setPersonalizar] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = e.currentTarget as HTMLFormElement
    const formData = new FormData(form)

    const res = await crearCorporativo(formData)
    if (res.error) {
      setError(res.error)
      setLoading(false)
      return
    }

    setLoading(false)
    setSent(true)
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
          style={{ background: 'var(--color-acero-brillo)', color: 'var(--color-granito-oscuro)' }}
        >
          ✓
        </div>
        <p className="text-lg font-semibold" style={{ color: 'var(--color-granito-oscuro)' }}>
          Gracias por contactarnos
        </p>
        <p className="text-sm max-w-md" style={{ color: 'var(--color-acero-oscuro)' }}>
          Recibimos tu solicitud. Nos pondremos en contacto a la brevedad para coordinar los próximos pasos.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

      {error && (
        <div className="px-4 py-3 rounded-lg text-sm font-medium" style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      <Field label="Nombre y Apellido" name="nombre" placeholder="Ej. Juan Pérez" />

      <Field label="Empresa" name="empresa" placeholder="Nombre de tu empresa" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Correo" name="correo" type="email" placeholder="correo@empresa.com" />
        <Field label="Teléfono" name="telefono" type="tel" placeholder="Ej. 11 1234-5678" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="CUIT o DNI" name="cuit" placeholder="XX-XXXXXXXX-X" />
        <Field label="Ciudad y Provincia" name="ubicacion" placeholder="Ej. CABA, Buenos Aires" />
      </div>

      {/* Ocasión */}
      <div>
        <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-granito-oscuro)' }}>
          ¿Para qué ocasión buscás regalos corporativos?
        </label>
        <select
          name="ocasion"
          required
          className="w-full px-3 py-2 text-base rounded-lg border-2 outline-none transition-colors duration-150 focus:border-[var(--color-acero-brillo)] shadow-inner"
          style={{
            borderColor: 'var(--color-granito-claro)',
            background: 'var(--color-granito)',
            color: 'var(--color-acero-brillo)',
          }}
        >
          <option value="" className="text-base" style={{ background: 'var(--color-granito)' }}>Seleccioná una opción</option>
          {ocasiones.map(o => (
            <option key={o} value={o} style={{ background: 'var(--color-granito)' }}>{o}</option>
          ))}
        </select>
      </div>

      <Field label="Cantidades requeridas" name="cantidades" type="number" placeholder="Ej. 100" />

      {/* Productos */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-granito-oscuro)' }}>
          ¿Qué productos te interesan?
        </label>
        <div className="flex flex-wrap gap-3">
          {productos.map(p => {
            const checked = selectedProducts.includes(p)
            return (
              <label
                key={p}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-colors duration-150"
                style={{
                  borderColor: checked ? 'var(--color-acero-brillo)' : 'var(--color-granito-claro)',
                  background: checked ? 'var(--color-granito)' : 'transparent',
                  color: checked ? 'var(--color-acero-brillo)' : 'var(--color-granito-oscuro)',
                }}
              >
                <input
                  type="checkbox"
                  name="productos"
                  value={p}
                  checked={checked}
                  onChange={() => {
                    setSelectedProducts(prev =>
                      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
                    )
                  }}
                  className="w-4 h-4 rounded accent-[var(--color-acero-brillo)]"
                />
                {p}
              </label>
            )
          })}
        </div>
      </div>

      {/* Personalización */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-granito-oscuro)' }}>
          ¿Querés que te lo personalicemos nosotros?
        </label>
        <div className="flex gap-4">
          {personalizarOptions.map(opt => {
            const checked = personalizar === opt
            return (
              <label
                key={opt}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-colors duration-150"
                style={{
                  borderColor: checked ? 'var(--color-acero-brillo)' : 'var(--color-granito-claro)',
                  background: checked ? 'var(--color-granito)' : 'transparent',
                  color: checked ? 'var(--color-acero-brillo)' : 'var(--color-granito-oscuro)',
                }}
              >
                <input
                  type="radio"
                  name="personalizar"
                  value={opt}
                  checked={checked}
                  onChange={() => setPersonalizar(opt)}
                  className="w-4 h-4 accent-[var(--color-acero-brillo)]"
                />
                {opt}
              </label>
            )
          })}
        </div>
      </div>

      <Field label="Fecha límite de entrega" name="fecha_limite" type="date" />

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-base font-medium transition-colors duration-200 disabled:opacity-60 mt-2"
        style={{
          background: 'var(--color-acero-brillo)',
          color: 'var(--color-granito-oscuro)',
        }}
      >
        {loading ? 'Enviando...' : 'Enviar solicitud'}
      </button>
    </form>
  )
}
