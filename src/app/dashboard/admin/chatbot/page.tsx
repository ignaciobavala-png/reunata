import { createClient } from '@/lib/supabase/server'
import { ChatbotClient } from './ChatbotClient'

export default async function ChatbotPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 pt-8 pb-4 flex-shrink-0">
        <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
          BotManager
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
          Asistente IA para gestionar Reunata. Consultá métricas, pedí análisis o preguntá cómo funciona cualquier sección.
        </p>
      </div>
      <ChatbotClient userId={user?.id ?? null} />
    </div>
  )
}
