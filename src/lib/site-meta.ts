import { cache } from 'react'
import { createServiceClient } from '@/lib/supabase/server'

const DEFAULT_TITULO = 'El mate que te une'

/**
 * Frase que hoy está de título en el hero de la home. Es la que tiene que
 * aparecer en la card de WhatsApp / redes, así que se lee de `configuracion`
 * (misma clave que edita el admin en Multimedia → Hero) en vez de estar fija.
 */
export const getSiteMeta = cache(async () => {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('configuracion')
      .select('valor')
      .eq('clave', 'hero_fallback_titulo')
      .maybeSingle()

    // el hero escribe el título con punto final ("Experiencia Social."),
    // que en un <title> queda raro
    const titulo = data?.valor?.trim().replace(/\.$/, '')

    return { titulo: titulo || DEFAULT_TITULO }
  } catch {
    return { titulo: DEFAULT_TITULO }
  }
})
