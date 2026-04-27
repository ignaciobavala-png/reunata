'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Mensaje {
  rol: 'user' | 'assistant'
  contenido: string
}

const BIENVENIDA: Mensaje = {
  rol: 'assistant',
  contenido: 'Hola, soy **BotManager**, el asistente IA de Reunata.\n\nPuedo ayudarte a:\n- Analizar métricas del negocio\n- Explicar cómo funciona cualquier sección\n- Detectar áreas de mejora\n\n¿En qué te ayudo hoy?',
}

export function ChatbotClient() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([BIENVENIDA])
  const [input, setInput] = useState('')
  const [cargando, setCargando] = useState(false)
  const [respuestaStream, setRespuestaStream] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, respuestaStream])

  async function enviar() {
    const texto = input.trim()
    if (!texto || cargando) return

    const nuevoMensaje: Mensaje = { rol: 'user', contenido: texto }
    const historial = [...mensajes.filter(m => m !== BIENVENIDA), nuevoMensaje]

    setMensajes(prev => [...prev, nuevoMensaje])
    setInput('')
    setCargando(true)
    setRespuestaStream('')

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: historial.map(m => ({ role: m.rol, content: m.contenido })),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
        setMensajes(prev => [...prev, { rol: 'assistant', contenido: `Error: ${err.error ?? 'No se pudo obtener respuesta'}` }])
        setCargando(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        setMensajes(prev => [...prev, { rol: 'assistant', contenido: 'No se recibió respuesta.' }])
        setCargando(false)
        return
      }

      const decoder = new TextDecoder()
      let textoCompleto = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        textoCompleto += chunk
        setRespuestaStream(textoCompleto)
      }

      setMensajes(prev => [...prev, { rol: 'assistant', contenido: textoCompleto }])
      setRespuestaStream('')
    } catch {
      setMensajes(prev => [...prev, { rol: 'assistant', contenido: 'Error de conexión. Reintentá.' }])
    } finally {
      setCargando(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
  }

  function formatTexto(texto: string) {
    return texto
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />')
  }

  return (
    <>
      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto px-8 pb-4 min-h-0">
        <div className="max-w-2xl mx-auto space-y-5">
          {mensajes.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.rol === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed`}
                style={{
                  background: msg.rol === 'user'
                    ? 'var(--color-granito)'
                    : 'var(--color-acero-brillo)',
                  color: msg.rol === 'user'
                    ? 'white'
                    : 'var(--foreground)',
                }}
                dangerouslySetInnerHTML={{ __html: formatTexto(msg.contenido) }}
              />
            </div>
          ))}

          {/* Respuesta en streaming */}
          {respuestaStream && (
            <div className="flex justify-start">
              <div
                className="max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed"
                style={{ background: 'var(--color-acero-brillo)', color: 'var(--foreground)' }}
                dangerouslySetInnerHTML={{ __html: formatTexto(respuestaStream) }}
              />
            </div>
          )}

          {/* Indicador de carga antes del primer token */}
          {cargando && !respuestaStream && (
            <div className="flex justify-start">
              <div
                className="rounded-2xl px-5 py-3"
                style={{ background: 'var(--color-acero-brillo)' }}
              >
                <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-acero)' }} />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-8 pb-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Preguntale a BotManager…"
              disabled={cargando}
              className="flex-1 px-4 py-3 text-sm rounded-xl border outline-none disabled:opacity-50"
              style={{
                borderColor: 'var(--color-acero-claro)',
                background: 'white',
                color: 'var(--foreground)',
              }}
            />
            <button
              onClick={enviar}
              disabled={cargando || !input.trim()}
              className="px-4 py-3 rounded-xl transition-colors duration-150 disabled:opacity-40"
              style={{ background: 'var(--color-granito)', color: 'white' }}
            >
              {cargando
                ? <Loader2 size={16} className="animate-spin" />
                : <Send size={16} />
              }
            </button>
          </div>
          <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--color-acero)' }}>
            BotManager solo lee métricas agregadas. No accede a datos de clientes ni productos individuales.
          </p>
        </div>
      </div>
    </>
  )
}
