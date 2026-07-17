'use client'

import { useState, useTransition } from 'react'
import { Settings, Plus, Loader2, X } from 'lucide-react'
import { CanalConfigDrawer, type CuentaSinIva } from './CanalConfigDrawer'
import type { CanalConfigPayload } from '@/app/actions/canales-config'
import { crearCanal, asignarCuentaSinIva } from '@/app/actions/canales'
import { formatPrecio } from '@/lib/utils'
import { tramosVolumen } from '@/lib/descuento-volumen'
import { ordenarCanales } from '@/lib/canales-orden'

type Canal = { id: number; slug: string; nombre: string; activo: boolean; categoria_comercial: 'minorista' | 'mayorista' | 'especial'; cuenta_sin_iva_id?: number | null }
type Config = Record<string, unknown>

const COLORES_CANAL: Record<string, string> = {
  consumidor_final: '#6366f1',
  distribuidor:     '#0ea5e9',
  local:            '#10b981',
  mercha:           '#f59e0b',
  fabricantes:      '#64748b',
  publico:          '#8b5cf6',
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function NuevoCanalModal({ onClose, onCreado }: { onClose: () => void; onCreado: (canal: Canal) => void }) {
  const [nombre, setNombre]                     = useState('')
  const [slug, setSlug]                         = useState('')
  const [slugManual, setSlugManual]             = useState(false)
  const [categoriaComercial, setCategoriaComercial] = useState<'mayorista' | 'minorista' | 'especial'>('mayorista')
  const [error, setError]                       = useState<string | null>(null)
  const [isPending, startTransition]            = useTransition()

  function handleNombreChange(v: string) {
    setNombre(v)
    if (!slugManual) setSlug(slugify(v))
  }

  function handleCrear() {
    if (!nombre.trim()) { setError('El nombre es obligatorio.'); return }
    if (!slug.trim())   { setError('El slug es obligatorio.'); return }
    setError(null)
    startTransition(async () => {
      const res = await crearCanal({ nombre, slug, categoria_comercial: categoriaComercial })
      if (!res.ok) { setError(res.error ?? 'Error al crear el canal.'); return }
      onCreado({ id: res.id!, slug, nombre, activo: true, categoria_comercial: categoriaComercial })
    })
  }

  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border outline-none'
  const inputStyle: React.CSSProperties = {
    borderColor: 'var(--color-acero-claro)',
    color: 'var(--foreground)',
    background: 'white',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-xl p-6 flex flex-col gap-4 shadow-2xl"
        style={{ background: 'white', border: '1px solid var(--color-acero-claro)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>Nuevo canal</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X size={14} style={{ color: 'var(--color-acero-oscuro)' }} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-acero-oscuro)' }}>Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={e => handleNombreChange(e.target.value)}
              placeholder="Ej: Agentes exclusivos"
              className={inputClass}
              style={inputStyle}
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-acero-oscuro)' }}>
              Slug <span className="ml-1 opacity-60">(único, no se puede cambiar después)</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={e => { setSlug(e.target.value); setSlugManual(true) }}
              placeholder="agentes_exclusivos"
              className={`${inputClass} font-mono`}
              style={inputStyle}
            />
          </div>

          <div>
            <label className="text-xs mb-2 block" style={{ color: 'var(--color-acero-oscuro)' }}>Tipo de canal</label>
            <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-acero-claro)' }}>
              {(['mayorista', 'minorista', 'especial'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setCategoriaComercial(t)}
                  className="flex-1 px-3 py-2 text-sm capitalize transition-colors"
                  style={{
                    background: categoriaComercial === t ? 'var(--color-granito-oscuro)' : 'white',
                    color: categoriaComercial === t ? 'white' : 'var(--color-acero-oscuro)',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-xs mt-1.5" style={{ color: 'var(--color-acero-oscuro)' }}>
              {categoriaComercial === 'mayorista' ? 'Lista de precios mayorista. Métodos de pago contado/financiado, mínimos y premios.' :
               categoriaComercial === 'minorista' ? 'Lista de precios minorista. Mercado Pago, envío cotizado y precios con IVA.' :
               'Lista de precios mayorista. Configuración especial sin flujo de checkout estándar.'}
            </p>
          </div>
        </div>

        {error && <p className="text-xs" style={{ color: '#dc2626' }}>{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm border transition-colors"
            style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleCrear}
            disabled={isPending}
            className="flex-1 py-2 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
            style={{ background: 'var(--color-granito-oscuro)' }}
          >
            {isPending && <Loader2 size={13} className="animate-spin" />}
            Crear canal
          </button>
        </div>
      </div>
    </div>
  )
}

export function CanalesListaClient({
  canales: canalesIniciales,
  configsIniciales,
  cuentasSinIva = [],
}: {
  canales: Canal[]
  configsIniciales: Record<number, Config>
  cuentasSinIva?: CuentaSinIva[]
}) {
  const [canales, setCanales]         = useState<Canal[]>(canalesIniciales)
  const [configs, setConfigs]         = useState<Record<number, Config>>(configsIniciales)
  const [drawerCanal, setDrawerCanal] = useState<Canal | null>(null)
  const [modalNuevo, setModalNuevo]   = useState(false)

  function handleSaved(canalId: number, payload: CanalConfigPayload) {
    setConfigs(prev => ({ ...prev, [canalId]: payload as unknown as Config }))
    if (payload.cuenta_sin_iva_id !== undefined) {
      setCanales(prev => prev.map(c =>
        c.id === canalId ? { ...c, cuenta_sin_iva_id: payload.cuenta_sin_iva_id } : c
      ))
    }
  }

  function handleCreado(canal: Canal) {
    setCanales(prev => [...prev, canal])
    setModalNuevo(false)
    setDrawerCanal(canal)
  }

  const [guardandoCuenta, setGuardandoCuenta] = useState<number | null>(null)

  async function handleCuentaChange(canalId: number, cuentaId: number | null) {
    const anterior = canales.find(c => c.id === canalId)?.cuenta_sin_iva_id ?? null
    setCanales(prev => prev.map(c => c.id === canalId ? { ...c, cuenta_sin_iva_id: cuentaId } : c))
    setGuardandoCuenta(canalId)
    const res = await asignarCuentaSinIva(canalId, cuentaId)
    setGuardandoCuenta(null)
    if (!res.ok) {
      setCanales(prev => prev.map(c => c.id === canalId ? { ...c, cuenta_sin_iva_id: anterior } : c))
      alert(res.error ?? 'No se pudo cambiar la cuenta.')
    }
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setModalNuevo(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-80"
          style={{ background: 'var(--color-granito-oscuro)' }}
        >
          <Plus size={14} />
          Nuevo canal
        </button>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-acero-claro)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--color-granito-oscuro)' }}>
              <th className="text-left px-5 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Canal</th>
              <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Compra mínima</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Desc. por volumen</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Descuento WEB</th>
              <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Envío gratis</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Transferencia Directa</th>
              <th className="text-center px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Config</th>
            </tr>
          </thead>
          <tbody>
            {ordenarCanales(canales).map((canal, i) => {
              const color = COLORES_CANAL[canal.slug] ?? '#94a3b8'
              const config = configs[canal.id]
              const minimo = config?.minimo_compra as number | null | undefined
              const tramos = tramosVolumen(config)
              const descWebPrimera    = (config?.desc_autogestion_primera_pct as number | undefined) ?? 0
              const descWebSiguientes = (config?.desc_autogestion_siguientes_pct as number | undefined) ?? 0
              const envioGratis = config?.envio_gratis_desde as number | null | undefined
              const sinDato = <span style={{ color: 'var(--color-acero-oscuro)' }}>—</span>

              return (
                <tr
                  key={canal.id}
                  style={{
                    background: i % 2 === 0 ? 'white' : '#f9fafb',
                    borderBottom: '1px solid var(--color-acero-claro)',
                    opacity: canal.activo ? 1 : 0.55,
                  }}
                >
                  {/* Nombre */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="font-medium" style={{ color: 'var(--foreground)' }}>{canal.nombre}</span>
                    </div>
                  </td>

                  {/* Compra mínima */}
                  <td className="px-4 py-3.5 text-right" style={{ color: 'var(--foreground)' }}>
                    {minimo ? formatPrecio(minimo) : sinDato}
                  </td>

                  {/* Descuento por volumen (hasta 3 instancias) */}
                  <td className="px-4 py-3.5">
                    {tramos.length === 0 ? sinDato : (
                      <div className="flex flex-col gap-0.5">
                        {tramos.map(t => (
                          <span key={t.montoMin} className="text-xs whitespace-nowrap" style={{ color: 'var(--foreground)' }}>
                            <span className="font-medium">{t.pct}%</span>
                            <span style={{ color: 'var(--color-acero-oscuro)' }}> superando </span>
                            {formatPrecio(t.montoMin)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Descuento WEB (autogestión) */}
                  <td className="px-4 py-3.5">
                    {descWebPrimera === 0 && descWebSiguientes === 0 ? sinDato : (
                      <span className="text-xs whitespace-nowrap" style={{ color: 'var(--foreground)' }}>
                        1ª compra <span className="font-medium">{descWebPrimera}%</span>
                        <span style={{ color: 'var(--color-acero-oscuro)' }}> · luego </span>
                        <span className="font-medium">{descWebSiguientes}%</span>
                      </span>
                    )}
                  </td>

                  {/* Envío gratis */}
                  <td className="px-4 py-3.5 text-right" style={{ color: 'var(--foreground)' }}>
                    {envioGratis ? (
                      <span className="whitespace-nowrap">
                        <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>desde </span>
                        {formatPrecio(envioGratis)}
                      </span>
                    ) : sinDato}
                  </td>

                  {/* Cuenta de Transferencia Directa */}
                  <td className="px-4 py-3.5">
                    {canal.categoria_comercial === 'minorista' ? sinDato : (
                      <select
                        value={canal.cuenta_sin_iva_id ?? ''}
                        disabled={guardandoCuenta === canal.id}
                        onChange={e => handleCuentaChange(canal.id, e.target.value ? Number(e.target.value) : null)}
                        className="max-w-44 px-2 py-1 text-xs rounded-lg border outline-none disabled:opacity-50"
                        style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)', background: 'white' }}
                      >
                        <option value="">Sin cuenta</option>
                        {cuentasSinIva.map(c => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                      </select>
                    )}
                  </td>

                  {/* Botón configurar */}
                  <td className="px-4 py-3.5 text-center">
                    <button
                      onClick={() => setDrawerCanal(canal)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
                      style={{
                        borderColor: color,
                        color,
                        background: 'white',
                      }}
                    >
                      <Settings size={12} />
                      Configurar
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modalNuevo && (
        <NuevoCanalModal
          onClose={() => setModalNuevo(false)}
          onCreado={handleCreado}
        />
      )}

      {drawerCanal && (
        <CanalConfigDrawer
          key={drawerCanal.id}
          canal={drawerCanal}
          configInicial={configs[drawerCanal.id]}
          cuentasSinIva={cuentasSinIva}
          cuentaSinIvaActualId={drawerCanal.cuenta_sin_iva_id}
          onClose={() => setDrawerCanal(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
