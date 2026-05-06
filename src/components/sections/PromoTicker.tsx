'use client'

import { motion } from 'framer-motion'

const items = [
  'Envío gratis desde $100.000',
  '6 cuotas sin interés',
  '10% Off por transferencia',
  '10% Off en próxima compra suscribiendo Newsletter',
  'El mate que te une',
]

export function PromoTicker() {
  return (
    <div className="w-full overflow-hidden border-y-4 border-[var(--color-granito-claro)] py-3 bg-[var(--color-granito)]">
      <motion.div
        className="flex gap-16 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ repeat: Infinity, duration: 30, ease: 'linear' }}
      >
        {[...items, ...items].map((item, i) => (
          <span
            key={i}
            className="text-sm font-semibold tracking-widest uppercase text-white/90"
          >
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  )
}
