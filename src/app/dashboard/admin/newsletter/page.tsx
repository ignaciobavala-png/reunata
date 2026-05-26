import { createServiceClient } from '@/lib/supabase/server'
import { NewsletterClient } from './NewsletterClient'

export default async function NewsletterPage() {
  const supabase = createServiceClient()

  const { data: suscriptores } = await supabase
    .from('newsletter_suscriptores')
    .select('id, email, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Newsletter
      </h1>
      <p className="text-base mb-8" style={{ color: 'var(--color-acero-oscuro)' }}>
        Emails suscriptos desde el footer del sitio.
      </p>
      <NewsletterClient suscriptores={suscriptores ?? []} />
    </div>
  )
}
