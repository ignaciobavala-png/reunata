'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { subirComprobante } from '@/app/actions/pedidos'
import { Upload, Loader2, Check } from 'lucide-react'

export function ComprobanteUploader({ pedidoId }: { pedidoId: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [subido, setSubido] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  async function handleFile(file: File) {
    setSubiendo(true)
    setError(null)

    const ext = file.name.split('.').pop()
    const path = `comprobantes/${pedidoId}/${Date.now()}.${ext}`

    const { error: uploadError } = await getSupabase().storage
      .from('multimedia')
      .upload(path, file, { upsert: false })

    if (uploadError) {
      setError('Error al subir el archivo. Intentá de nuevo.')
      setSubiendo(false)
      return
    }

    await subirComprobante(pedidoId, path)
    setSubido(true)
    setSubiendo(false)
  }

  if (subido) {
    return (
      <div className="rounded-xl border p-5 flex items-center gap-3" style={{ background: '#10b98115', borderColor: '#10b98144' }}>
        <Check size={18} style={{ color: '#10b981' }} />
        <div>
          <p className="text-base font-medium" style={{ color: '#10b981' }}>Comprobante enviado</p>
          <p className="text-sm" style={{ color: '#10b981' }}>Lo revisaremos y confirmaremos tu pago en breve.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border p-5" style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}>
      <h2 className="text-base font-medium mb-1" style={{ color: 'var(--foreground)' }}>
        Subir comprobante de pago
      </h2>
      <p className="text-sm mb-4" style={{ color: 'var(--color-acero-oscuro)' }}>
        Opcional pero recomendado. Acelerá la confirmación de tu pedido.
      </p>

      <button
        onClick={() => inputRef.current?.click()}
        disabled={subiendo}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm border transition-colors duration-150 disabled:opacity-60"
        style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}
      >
        {subiendo ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
        {subiendo ? 'Subiendo…' : 'Seleccionar archivo'}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {error && <p className="text-sm mt-2" style={{ color: '#ef4444' }}>{error}</p>}
    </div>
  )
}
