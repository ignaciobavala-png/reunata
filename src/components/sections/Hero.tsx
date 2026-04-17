'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative h-screen w-full overflow-hidden bg-[var(--color-granito-oscuro)]">
      {/* Imagen de fondo full */}
      <Image
        src="/fotos/hero1.jpg"
        alt="Reunata — El mate que te une"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />

      {/* Overlay oscuro para legibilidad */}
      <div className="absolute inset-0 bg-black/45 pointer-events-none" />

      {/* Contenido centrado sobre la imagen */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="text-[10px] tracking-[0.4em] uppercase text-white/60 mb-6"
        >
          Nueva Colección — 2025
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="text-6xl md:text-8xl lg:text-9xl leading-[1.0] text-white mb-6"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          El mate
          <br />
          <em>que te une.</em>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="text-sm text-white/60 leading-relaxed max-w-sm mb-12"
        >
          Productos importados, diseñados para quienes toman el mate en serio.
          Acero, granito y tradición en cada pieza.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Link
            href="/tienda"
            className="group inline-flex items-center gap-3 bg-white text-[var(--color-granito-oscuro)] px-8 py-4 text-xs tracking-widest uppercase hover:bg-[var(--color-acero-brillo)] transition-colors duration-300"
          >
            Ver tienda
            <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <Link
            href="/colecciones"
            className="inline-flex items-center gap-2 border border-white/40 px-8 py-4 text-xs tracking-widest uppercase text-white hover:border-white transition-colors duration-300"
          >
            Colecciones
          </Link>
        </motion.div>
      </div>

      {/* Indicador scroll */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-[9px] tracking-[0.4em] uppercase text-white/40">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          className="w-px h-8 bg-gradient-to-b from-white/40 to-transparent"
        />
      </motion.div>
    </section>
  )
}
