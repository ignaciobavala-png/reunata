'use client'

import { motion } from 'framer-motion'

interface FadeInProps {
  children: React.ReactNode
  delay?: number
  className?: string
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
}

const offsets = {
  up:    { y: 32, x: 0 },
  down:  { y: -32, x: 0 },
  left:  { x: 32, y: 0 },
  right: { x: -32, y: 0 },
  none:  { x: 0, y: 0 },
}

export function FadeIn({ children, delay = 0, className, direction = 'up' }: FadeInProps) {
  const offset = offsets[direction]
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-8%' }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
