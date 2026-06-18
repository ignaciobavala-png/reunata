'use client'

import { useState } from 'react'
import { Settings } from 'lucide-react'
import { CanalConfigDrawer } from './CanalConfigDrawer'
import type { CanalConfigPayload } from '@/app/actions/canales-config'
import { formatPrecio } from '@/lib/utils'

type Canal = { id: number; slug: string; nombre: string; activo: boolean }
type Config = Record<string, unknown>

const COLORES_CANAL: Record<string, string> = {
  consumidor_final: '#6366f1',
  distribuidor:     '#0ea5e9',
  local:            '#10b981',
  mercha:           '#f59e0b',
  fabricantes:      '#64748b',
}

const MAYORISTAS = ['distribuidor', 'local', 'mercha', 'fabricantes']

export function CanalesListaClient({
  canales,
  configsIniciales,
}: {
  canales: Canal[]
  configsIniciales: Record<number, Config>
}) {
  const [configs, setConfigs] = useState<Record<number, Config>>(configsIniciales)
  const [drawerCanal, setDrawerCanal] = useState<Canal | null>(null)

  function handleSaved(canalId: number, payload: CanalConfigPayload) {
    setConfigs(prev => ({ ...prev, [canalId]: payload as unknown as Config }))
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
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        background: MAYORISTAS.includes(canal.slug) ? '#e0f2fe'
                          : canal.slug === 'fabricantes' ? '#f1f5f9'
                          : '#ede9fe',
                        color: MAYORISTAS.includes(canal.slug) ? '#0369a1'
                          : canal.slug === 'fabricantes' ? '#475569'
                          : '#6d28d9',
                      }}
                    >
                      {MAYORISTAS.includes(canal.slug) ? 'Mayorista'
                        : canal.slug === 'fabricantes' ? 'Especial'
                        : 'Minorista'}
                    </span>
                  </td>

                  {/* Formas de pago */}
                  <td className="px-4 py-3.5">
                    {pagos.length === 0 ? (
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

      {drawerCanal && (
        <CanalConfigDrawer
          key={drawerCanal.id}
          canal={drawerCanal}
          configInicial={configs[drawerCanal.id]}
          onClose={() => setDrawerCanal(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
