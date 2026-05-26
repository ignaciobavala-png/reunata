'use client'

import { useState } from 'react'
import { Search, Download } from 'lucide-react'

interface Suscriptor {
  id: string
  email: string
  created_at: string
}

export function NewsletterClient({ suscriptores }: { suscriptores: Suscriptor[] }) {
  const [busqueda, setBusqueda] = useState('')

  const filtrados = suscriptores.filter(s =>
    !busqueda || s.email.toLowerCase().includes(busqueda.toLowerCase())
  )

  function exportarCSV() {
    const rows = ['Email,Fecha de suscripción', ...suscriptores.map(s =>
      `${s.email},${new Date(s.created_at).toLocaleString('es-AR')}`
    )]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `newsletter-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-acero)' }} />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar email…"
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border outline-none"
            style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
          />
        </div>

        <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
          {filtrados.length} de {suscriptores.length} suscriptores
        </span>

        <button
          onClick={exportarCSV}
          disabled={suscriptores.length === 0}
          className="ml-auto flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-colors disabled:opacity-40"
          style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)', background: 'white' }}
        >
          <Download size={14} />
          Exportar CSV
        </button>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-acero-claro)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--color-granito-oscuro)' }}>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Email</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Fecha de suscripción</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((s, i) => (
              <tr
                key={s.id}
                style={{
                  background: i % 2 === 0 ? 'white' : '#f9fafb',
                  borderBottom: '1px solid var(--color-acero-claro)',
                }}
              >
                <td className="px-4 py-3" style={{ color: 'var(--foreground)' }}>{s.email}</td>
                <td className="px-4 py-3" style={{ color: 'var(--color-acero-oscuro)' }}>
                  {new Date(s.created_at).toLocaleString('es-AR')}
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-12 text-center text-base" style={{ color: 'var(--color-acero-oscuro)' }}>
                  {busqueda ? `Sin resultados para "${busqueda}"` : 'Todavía no hay suscriptores.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
