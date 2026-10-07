import { createServiceClient } from '@/lib/supabase/server'

const DEFAULT_ITEMS = [
  'Envío gratis desde $100.000',
  '6 cuotas sin interés',
  '10% Off por transferencia',
  '10% Off en próxima compra suscribiendo Newsletter',
  'El mate que te une',
]

const DEFAULT_SPEED = 30

// Veces que se repiten las frases dentro de cada tira. Con pocas frases cortas
// un solo juego mide ~1.000 px, menos que un monitor: repetirlo evita que las
// frases queden muy separadas en pantallas anchas.
const REPETICIONES = 3

async function leerConfig() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('configuracion')
    .select('clave, valor')
    .in('clave', ['promo_items', 'promo_speed'])

  let items = DEFAULT_ITEMS
  const itemsRow = data?.find(r => r.clave === 'promo_items')
  if (itemsRow?.valor) {
    try {
      const parsed = JSON.parse(itemsRow.valor)
      if (Array.isArray(parsed) && parsed.length > 0) items = parsed
    } catch {}
  }

  const speedRow = data?.find(r => r.clave === 'promo_speed')
  const speed = (speedRow?.valor && parseInt(speedRow.valor, 10)) || DEFAULT_SPEED

  return { items, speed }
}

/**
 * Cinturón de promos. Dos tiras gemelas, cada una de al menos el ancho de la
 * pantalla, que se corren -100% de su propio ancho en CSS: cuando la primera
 * terminó de salir, la segunda ocupa exactamente su lugar y el reinicio no se
 * ve. La versión anterior era una sola tira corrida a la mitad, medida en JS:
 * en pantallas anchas quedaba un hueco al final de cada vuelta y la cuenta del
 * gap la hacía saltar 40 px.
 *
 * `promo_speed` (panel) son los segundos que tarda en pasar un juego de frases.
 */
export async function PromoTicker() {
  const { items, speed } = await leerConfig()
  if (items.length === 0) return null

  const frases = Array.from({ length: REPETICIONES }, () => items).flat()
  const duracion = `${speed * REPETICIONES}s`

  return (
    <div className="flex w-screen max-w-full overflow-hidden border-y-4 border-[var(--color-granito-claro)] py-4 bg-[var(--color-granito)]">
      {[0, 1].map(copia => (
        <div
          key={copia}
          aria-hidden={copia === 1 || undefined}
          className="flex min-w-full shrink-0 justify-around whitespace-nowrap animate-marquee motion-reduce:animate-none"
          style={{ animationDuration: duracion }}
        >
          {frases.map((item, i) => (
            <span
              key={i}
              className="px-10 text-sm font-semibold tracking-widest uppercase text-white/90"
            >
              {item}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}
