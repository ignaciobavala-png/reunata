'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { supabaseImg } from '@/lib/images'

interface HeroAsset {
  id: number
  tipo: 'imagen' | 'video'
  url: string
  orden: number
  activo: boolean
  etiqueta: string | null
  titulo: string | null
  subtitulo: string | null
  boton_texto: string | null
  boton_url: string | null
}

const FALLBACK = {
  etiqueta: 'Nueva Colección — 2025',
  titulo: 'El mate que te une.',
  subtitulo: 'Productos importados, diseñados para quienes toman el mate en serio. Acero, granito y tradición en cada pieza.',
  boton_texto: 'Ver tienda',
  boton_url: '/tienda',
}

export function HeroCarousel({ assets, supabaseUrl }: { assets: HeroAsset[]; supabaseUrl: string }) {
  const getPublicUrl = (url: string) => supabaseImg(supabaseUrl, url, 1920)
  const [current, setCurrent] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const next = useCallback(() => {
    setCurrent(prev => (prev + 1) % assets.length)
  }, [assets.length])

  const prev = useCallback(() => {
    setCurrent(prev => (prev - 1 + assets.length) % assets.length)
  }, [assets.length])

  useEffect(() => {
    if (isPaused || assets.length <= 1) return
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [next, isPaused, assets.length])

  const asset = assets[current]
  if (!asset) return null

  const etiqueta = asset.etiqueta || FALLBACK.etiqueta
  const titulo = asset.titulo || FALLBACK.titulo
  const subtitulo = asset.subtitulo || FALLBACK.subtitulo
  const boton_texto = asset.boton_texto || FALLBACK.boton_texto
  const boton_url = asset.boton_url || FALLBACK.boton_url

  return (
    <section className="relative h-screen w-full overflow-hidden bg-[var(--color-granito-oscuro)]">
      <AnimatePresence mode="wait">
        <motion.div
          key={asset.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          {asset.tipo === 'imagen' ? (
            <Image
              src={getPublicUrl(asset.url)}
              alt=""
              fill
              priority
              className="object-cover object-center"
              sizes="100vw"
            />
          ) : (
            <video
              src={getPublicUrl(asset.url)}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 bg-black/45 pointer-events-none" />

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <motion.span
          key={`label-${current}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="text-[10px] tracking-[0.4em] uppercase text-white/60 mb-6"
        >
          {etiqueta}
        </motion.span>

        <motion.h1
          key={`title-${current}`}
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.65 }}
          className="text-6xl md:text-8xl lg:text-9xl leading-[1.0] text-white mb-6"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {titulo}
        </motion.h1>

        <motion.p
          key={`sub-${current}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.85 }}
          className="text-sm text-white/60 leading-relaxed max-w-sm mb-12"
        >
          {subtitulo}
        </motion.p>

        <motion.div
          key={`cta-${current}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Link
            href={boton_url}
            className="group inline-flex items-center gap-3 bg-white text-[var(--color-granito-oscuro)] px-8 py-4 text-xs tracking-widest uppercase hover:bg-[var(--color-acero-brillo)] transition-colors duration-300"
          >
            {boton_texto}
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

      {assets.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white transition-colors z-10"
            aria-label="Anterior"
          >
            <ChevronLeft size={32} />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white transition-colors z-10"
            aria-label="Siguiente"
          >
            <ChevronRight size={32} />
          </button>
        </>
      )}

      {assets.length > 1 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {assets.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="w-2 h-2 rounded-full transition-all"
              style={{ background: i === current ? 'white' : 'rgba(255,255,255,0.3)' }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="ml-3 text-white/50 hover:text-white transition-colors"
            aria-label={isPaused ? 'Reproducir' : 'Pausar'}
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
          </button>
        </div>
      )}

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
