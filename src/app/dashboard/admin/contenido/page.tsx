import { createClient } from '@/lib/supabase/server'
import { ContenidoClient } from './ContenidoClient'

export default async function ContenidoPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('configuracion')
    .select('clave, valor')
    .in('clave', [
      'nosotros_hero_titulo', 'nosotros_hero_texto',
      'nosotros_valor_1_titulo', 'nosotros_valor_1_texto',
      'nosotros_valor_2_titulo', 'nosotros_valor_2_texto',
      'nosotros_valor_3_titulo', 'nosotros_valor_3_texto',
      'faq_items',
    ])

  const cfg: Record<string, string> = {}
  for (const r of rows ?? []) cfg[r.clave] = r.valor

  const nosotros = {
    hero_titulo:    cfg['nosotros_hero_titulo']    ?? '',
    hero_texto:     cfg['nosotros_hero_texto']     ?? '',
    valor_1_titulo: cfg['nosotros_valor_1_titulo'] ?? '',
    valor_1_texto:  cfg['nosotros_valor_1_texto']  ?? '',
    valor_2_titulo: cfg['nosotros_valor_2_titulo'] ?? '',
    valor_2_texto:  cfg['nosotros_valor_2_texto']  ?? '',
    valor_3_titulo: cfg['nosotros_valor_3_titulo'] ?? '',
    valor_3_texto:  cfg['nosotros_valor_3_texto']  ?? '',
  }

  let faq = []
  try { faq = JSON.parse(cfg['faq_items'] ?? '[]') } catch { faq = [] }

  return (
    <div className="p-8 h-full flex flex-col">
      <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Contenido
      </h1>
      <p className="text-base mb-6" style={{ color: 'var(--color-acero-oscuro)' }}>
        Editá los textos de las páginas públicas Nosotros y Preguntas frecuentes.
      </p>
      <ContenidoClient tab={tab ?? 'nosotros'} nosotros={nosotros} faq={faq} />
    </div>
  )
}
