'use client'

import { useState } from 'react'
import { crearPostulacion } from '@/app/actions/postulaciones'
import { Upload, Loader2 } from 'lucide-react'

function Field({ label, name, type = 'text', required = true }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-acero)' }}>
        {label}
      </label>
      <input
        name={name}
        type={type}
        required={required}
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

function CVField() {
  const [fileName, setFileName] = useState<string | null>(null)

  return (
    <div>
      <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-acero)' }}>
        Currículum (PDF, DOC, imágenes)
      </label>
      <label
        className="flex items-center gap-3 px-3 py-2 rounded-lg border-2 cursor-pointer transition-colors duration-150 hover:border-[var(--color-acero-brillo)] shadow-inner"
        style={{ borderColor: 'var(--color-granito-claro)', background: 'var(--color-granito)' }}
      >
        <Upload size={16} style={{ color: 'var(--color-acero-oscuro)' }} />
        <span className="text-base truncate" style={{ color: fileName ? 'var(--color-acero-brillo)' : 'var(--color-acero)' }}>
          {fileName || 'Seleccionar archivo (máx. 5 MB)'}
        </span>
        <input
          name="cv"
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={e => setFileName(e.target.files?.[0]?.name ?? null)}
          className="hidden"
        />
      </label>
    </div>
  )
}

function SubmitButton({ loading }: { loading: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-base font-medium transition-colors duration-200 disabled:opacity-60"
      style={{
        background: 'var(--color-acero-brillo)',
        color: 'var(--color-granito-oscuro)',
      }}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      Enviar postulación
    </button>
  )
}

interface Props {
  tipo: 'fulltime' | 'comisionista' | 'proveedor'
  titulo: string
  descripcion: string
}

export function PostulacionForm({ tipo, titulo, descripcion }: Props) {
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<{ error?: string; ok?: boolean } | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setLoading(true)
    setResultado(null)

    const formData = new FormData(form)
    formData.set('tipo', tipo)

    const res = await crearPostulacion(formData)
    setResultado(res)
    setLoading(false)

    if (res.ok) {
      form.reset()
    }
  }

  return (
    <div
      className={`flex flex-col flex-1 ${titulo ? 'p-5 md:p-6 rounded-xl border-2 h-full' : ''}`}
    >
      {titulo && (
        <>
          <h2
            className="text-xl md:text-2xl mb-2"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-acero-brillo)' }}
          >
            {titulo}
          </h2>
          <p className="text-base leading-relaxed" style={{ color: 'var(--color-acero)' }}>
            {descripcion}
          </p>
        </>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nombre" name="nombre" />
          <Field label="Apellido" name="apellido" />
        </div>
        <Field label="E-mail" name="email" type="email" />
        <Field label="DNI" name="dni" />
        <Field label="Dirección" name="direccion" />
        <Field label="Nacionalidad" name="nacionalidad" />

        {tipo === 'fulltime' && (
          <CVField />
        )}

        {tipo === 'comisionista' && (
          <>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="movilidad_propia"
                value="true"
                id={`movilidad-${tipo}`}
                className="w-4 h-4 rounded accent-[var(--color-acero-brillo)]"
              />
              <label
                htmlFor={`movilidad-${tipo}`}
                className="text-base cursor-pointer"
                style={{ color: 'var(--color-acero)' }}
              >
                Tengo movilidad propia
              </label>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-acero)' }}>
                Zonas que recorrés habitualmente
              </label>
              <textarea
                name="zonas"
                rows={2}
                className="w-full px-3 py-2 text-base rounded-lg border-2 outline-none transition-colors duration-150 resize-none shadow-inner focus:border-[var(--color-acero-brillo)]"
                style={{
                  borderColor: 'var(--color-granito-claro)',
                  background: 'var(--color-granito)',
                  color: 'var(--color-acero-brillo)',
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-acero)' }}>
                ¿Vendés otras marcas? ¿Cuáles?
              </label>
              <input
                name="otras_marcas"
                type="text"
                className="w-full px-3 py-2 text-base rounded-lg border-2 outline-none transition-colors duration-150 shadow-inner focus:border-[var(--color-acero-brillo)]"
                style={{
                  borderColor: 'var(--color-granito-claro)',
                  background: 'var(--color-granito)',
                  color: 'var(--color-acero-brillo)',
                }}
              />
            </div>
          </>
        )}

        {tipo === 'proveedor' && (
          <>
            <Field label="Cargo" name="cargo" />
            <Field label="Empresa" name="empresa" />
            <Field label="CUIT" name="cuit" />
            <Field label="Página Web" name="pagina_web" />
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-acero)' }}>
                Productos o Servicio que ofrece
              </label>
              <textarea
                name="productos_servicios"
                rows={3}
                className="w-full px-3 py-2 text-base rounded-lg border-2 outline-none transition-colors duration-150 resize-none shadow-inner focus:border-[var(--color-acero-brillo)]"
                style={{
                  borderColor: 'var(--color-granito-claro)',
                  background: 'var(--color-granito)',
                  color: 'var(--color-acero-brillo)',
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-acero)' }}>
                Otras empresas a las que provee
              </label>
              <textarea
                name="otras_empresas_provee"
                rows={3}
                className="w-full px-3 py-2 text-base rounded-lg border-2 outline-none transition-colors duration-150 resize-none shadow-inner focus:border-[var(--color-acero-brillo)]"
                style={{
                  borderColor: 'var(--color-granito-claro)',
                  background: 'var(--color-granito)',
                  color: 'var(--color-acero-brillo)',
                }}
              />
            </div>
          </>
        )}

        <div className="mt-2">
          <SubmitButton loading={loading} />
        </div>

        {resultado?.error && (
          <p className="text-sm text-red-400 mt-2">{resultado.error}</p>
        )}
        {resultado?.ok && (
          <p className="text-sm mt-2" style={{ color: '#4ade80' }}>
            Postulación enviada con éxito. Te contactaremos pronto.
          </p>
        )}
      </form>
    </div>
  )
}
