'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

const DEFAULT_ITEMS = [
  'Envío gratis desde $100.000',
  '6 cuotas sin interés',
  '10% Off por transferencia',
  '10% Off en próxima compra suscribiendo Newsletter',
  'El mate que te une',
]

const DEFAULT_SPEED = 30

export function PromoTicker() {
  const [items, setItems] = useState(DEFAULT_ITEMS)
  const [speed, setSpeed] = useState(DEFAULT_SPEED)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('configuracion')
        .select('clave, valor')
        .in('clave', ['promo_items', 'promo_speed'])

      const itemsRow = data?.find(r => r.clave === 'promo_items')
      if (itemsRow?.valor) {
        try { setItems(JSON.parse(itemsRow.valor)) } catch {}
      }

      const speedRow = data?.find(r => r.clave === 'promo_speed')
      if (speedRow?.valor) {
        setSpeed(parseInt(speedRow.valor, 10) || DEFAULT_SPEED)
      }

      setReady(true)
    }
    load()
  }, [])

  if (!ready || items.length === 0) return null

  return (
    <div className="w-screen max-w-full overflow-hidden border-y-4 border-[var(--color-granito-claro)] py-4 bg-[var(--color-granito)]">
      <motion.div
        className="flex gap-20 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ repeat: Infinity, duration: speed, ease: 'linear' }}
      >
        {[...items, ...items].map((item, i) => (
          <span
            key={i}
            className="text-sm md:text-base font-semibold tracking-widest uppercase text-white/90"
          >
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  )
}
