'use client'

import { Download } from 'lucide-react'
import { useState } from 'react'

export function ExportButton({ params, count }: { params: string; count: number }) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const qs = params ? `?${params}` : ''
      const res = await fetch(`/api/pedidos/export${qs}`)
      if (!res.ok) throw new Error('Error al exportar')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('x-filename') ?? 'pedidos.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading || count === 0}
      className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-opacity hover:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)', background: 'white' }}
    >
      <Download size={14} />
      {loading ? 'Exportando…' : 'Exportar Excel'}
    </button>
  )
}
