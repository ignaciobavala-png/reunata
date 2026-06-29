'use client'

import { useState, useTransition } from 'react'
import { Settings, Plus, Loader2, X } from 'lucide-react'
import { CanalConfigDrawer, type CuentaSinIva } from './CanalConfigDrawer'
import type { CanalConfigPayload } from '@/app/actions/canales-config'
import { crearCanal } from '@/app/actions/canales'
import { formatPrecio } from '@/lib/utils'

type Canal = { id: number; slug: string; nombre: string; activo: boolean; tipo: 'minorista' | 'mayorista' | 'especial'; cuenta_sin_iva_id?: number | null }
type Config = Record<string, unknown>

const COLORES_CANAL: Record<string, string> = {
  consumidor_final: '#6366f1',
  distribuidor:     '#0ea5e9',
  local:            '#10b981',
  mercha:           '#f59e0b',
  fabricantes:      '#64748b',
  publico:          '#8b5cf6',
}

const LISTAS_PRECIOS = [
  { value: 'precio_lista1', label: 'Lista 1 – Distribuidor' },
  { value: 'precio_lista2', label: 'Lista 2 – Local' },
  { value: 'precio_lista3', label: 'Lista 3 – Mercha' },
  { value: 'precio_lista5', label: 'Lista 5 – Consumidor final' },
]

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function NuevoCanalModal({ onClose, onCreado }: { onClose: () => void; onCreado: (canal: Canal) => void }) {
  const [nombre, setNombre]           = useState('')
  const [slug, setSlug]               = useState('')
  const [slugManual, setSlugManual]   = useState(false)
  const [listaPrecio, setListaPrecio] = useState('precio_lista1')
  const [tipo, setTipo]               = useState<'mayorista' | 'minorista' | 'especial'>('mayorista')
  const [error, setError]             = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()

  function handleNombreChange(v: string) {
    setNombre(v)
    if (!slugManual) setSlug(slugify(v))
  }

  function handleCrear() {
    if (!nombre.trim()) { setError('El nombre es obligatorio.'); return }
    if (!slug.trim())   { setError('El slug es obligatorio.'); return }
    setError(null)
    startTransition(async () => {
      const res = await crearCanal({ nombre, slug, lista_precios: listaPrecio, tipo })
      if (!res.ok) { setError(res.error ?? 'Error al crear el canal.'); return }
      onCreado({ id: res.id!, slug, nombre, activo: true, tipo })
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
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-acero-oscuro)' }}>Lista de precios</label>
            <select value={listaPrecio} onChange={e => setListaPrecio(e.target.value)} className={inputClass} style={inputStyle}>
              {LISTAS_PRECIOS.map(l => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs mb-2 block" style={{ color: 'var(--color-acero-oscuro)' }}>Tipo de canal</label>
            <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-acero-claro)' }}>
              {(['mayorista', 'minorista', 'especial'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className="flex-1 px-3 py-2 text-sm capitalize transition-colors"
                  style={{
                    background: tipo === t ? 'var(--color-granito-oscuro)' : 'white',
                    color: tipo === t ? 'white' : 'var(--color-acero-oscuro)',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-xs mt-1.5" style={{ color: 'var(--color-acero-oscuro)' }}>
              {tipo === 'mayorista' ? 'Métodos de pago contado/financiado, mínimos y premios.' :
               tipo === 'minorista' ? 'Mercado Pago, envío cotizado y precios con IVA.' :
               'Configuración especial sin flujo de checkout estándar.'}
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
  }

  function handleCreado(canal: Canal) {
    setCanales(prev => [...prev, canal])
    setModalNuevo(false)
    setDrawerCanal(canal)
  }

  function resumePagos(config: Config | undefined): string[] {
    if (!config?.pagos_habilitados) return []
    const pagos = config.pagos_habilitados as Record<string, { activo: boolean }>
    return Object.entries(pagos)
      .filter(([, v]) => v.activo)
      .map(([k]) => k.replace(/_/g, ' '))
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
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Tipo</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Formas de pago activas</th>
              <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Mínimo pedido</th>
              <th className="text-center px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Estado</th>
              <th className="text-center px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Config</th>
            </tr>
          </thead>
          <tbody>
            {canales.map((canal, i) => {
              const color = COLORES_CANAL[canal.slug] ?? '#94a3b8'
              const config = configs[canal.id]
              const pagos = resumePagos(config)
              const minimo = config?.minimo_compra as number | null | undefined

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
                      <span className="text-xs font-mono" style={{ color: 'var(--color-acero-oscuro)' }}>{canal.slug}</span>
                    </div>
                  </td>

                  {/* Tipo */}
                  <td className="px-4 py-3.5">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs capitalize"
                      style={{
                        background: canal.tipo === 'mayorista' ? '#e0f2fe'
                          : canal.tipo === 'especial' ? '#f1f5f9'
                          : '#ede9fe',
                        color: canal.tipo === 'mayorista' ? '#0369a1'
                          : canal.tipo === 'especial' ? '#475569'
                          : '#6d28d9',
                      }}
                    >
                      {canal.tipo}
                    </span>
                  </td>

                  {/* Formas de pago */}
                  <td className="px-4 py-3.5">
                    {canal.tipo === 'minorista' ? (
                      <span
                        className="px-1.5 py-0.5 rounded text-xs"
                        style={{ background: '#e0f2fe', color: '#0369a1' }}
                      >
                        Mercado Pago
                      </span>
                    ) : pagos.length === 0 ? (
                      <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>Sin configurar</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {pagos.map(p => (
                          <span
                            key={p}
                            className="px-1.5 py-0.5 rounded text-xs capitalize"
                            style={{ background: color + '1a', color }}
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Mínimo */}
                  <td className="px-4 py-3.5 text-right" style={{ color: 'var(--foreground)' }}>
                    {minimo ? formatPrecio(minimo) : <span style={{ color: 'var(--color-acero-oscuro)' }}>—</span>}
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        background: canal.activo ? '#dcfce7' : '#fee2e2',
                        color: canal.activo ? '#16a34a' : '#dc2626',
                      }}
                    >
                      {canal.activo ? 'Activo' : 'Inactivo'}
                    </span>
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
