'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react'

type SyncResult = { ok: boolean; registros: number; ms: number; error?: string }
type Tipo = 'productos' | 'clientes'

export function SyncClient({ isMaster }: { isMaster: boolean }) {
  const [loading, setLoading] = useState<Tipo | null>(null)
  const [results, setResults] = useState<Record<Tipo, SyncResult | null>>({ productos: null, clientes: null })

  async function runSync(tipo: Tipo) {
    setLoading(tipo)
    try {
      const res = await fetch(`/api/sync/${tipo}`, {
        method: 'POST',
        headers: { 'X-Is-Master': isMaster ? 'true' : 'false' },
      })
      const data = await res.json()
      setResults(prev => ({ ...prev, [tipo]: data }))
    } catch {
      setResults(prev => ({ ...prev, [tipo]: { ok: false, registros: 0, ms: 0, error: 'Error de red' } }))
    } finally {
      setLoading(null)
    }
  }

  const tipos: { tipo: Tipo; label: string; desc: string }[] = [
    { tipo: 'productos', label: 'Productos', desc: 'Sincroniza catálogo completo desde api_items.php de Gesu' },
    { tipo: 'clientes',  label: 'Clientes',  desc: 'Verifica clientes en api_clieprov.php de Gesu' },
  ]

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Sincronización con Gesu
      </h1>
      <p className="text-base mb-8" style={{ color: 'var(--color-acero-oscuro)' }}>
        Actualizá los datos de productos y clientes desde el sistema de gestión externo.
      </p>

      <div className="grid gap-4 max-w-xl">
        {tipos.map(({ tipo, label, desc }) => {
          const result = results[tipo]
          const isLoading = loading === tipo

          return (
            <div
              key={tipo}
              className="rounded-xl p-6 border"
              style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-base font-medium mb-1" style={{ color: 'var(--foreground)' }}>{label}</p>
                  <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>{desc}</p>

                  {result && (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      {result.ok
                        ? <CheckCircle size={14} className="text-green-600" />
                        : <XCircle size={14} className="text-red-500" />}
                      <span style={{ color: result.ok ? '#16a34a' : '#ef4444' }}>
                        {result.ok
                          ? `${result.registros} registros actualizados en ${result.ms}ms`
                          : result.error}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => runSync(tipo)}
                  disabled={!!loading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors duration-150 disabled:opacity-50"
                  style={{ background: 'var(--color-granito)', color: 'var(--color-acero-brillo)' }}
                >
                  <RefreshCw size={13} strokeWidth={2} className={isLoading ? 'animate-spin' : ''} />
                  {isLoading ? 'Sincronizando…' : 'Sincronizar'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 p-4 rounded-lg max-w-xl" style={{ background: 'var(--color-acero-brillo)' }}>
        <div className="flex gap-2">
          <Clock size={14} strokeWidth={1.5} style={{ color: 'var(--color-acero-oscuro)', flexShrink: 0, marginTop: 1 }} />
          <p className="text-sm" style={{ color: 'var(--color-granito-claro)' }}>
            La sincronización automática corre cada hora via Vercel Cron. Usá este panel para forzarla manualmente.
          </p>
        </div>
      </div>
    </div>
  )
}
