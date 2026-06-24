'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Lenis from 'lenis'

function scrollKey(path: string) {
  return `scroll:${path}`
}

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null)
  const pathname = usePathname()
  // True cuando el último cambio de ruta fue un popstate (botón atrás/adelante)
  const isPopRef = useRef(false)

  useEffect(() => {
    history.scrollRestoration = 'manual'

    const lenis = new Lenis({
      duration: 1.3,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      lerp: 0.1,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    })
    lenisRef.current = lenis

    // Guardar posición de scroll por ruta
    lenis.on('scroll', ({ scroll }: { scroll: number }) => {
      sessionStorage.setItem(scrollKey(window.location.pathname), String(Math.round(scroll)))
    })

    // Detectar botón atrás / adelante del browser
    function onPopState() {
      isPopRef.current = true
    }
    window.addEventListener('popstate', onPopState)

    let raf: number
    function tick(time: number) {
      lenis.raf(time)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
      lenisRef.current = null
      window.removeEventListener('popstate', onPopState)
    }
  }, [])

  // En cada cambio de ruta: restaurar si fue popstate, o ir al top si fue navegación normal
  useEffect(() => {
    const lenis = lenisRef.current

    if (isPopRef.current) {
      isPopRef.current = false
      const saved = sessionStorage.getItem(scrollKey(pathname))
      if (saved) {
        const y = parseInt(saved, 10)
        // Doble rAF para esperar que el DOM esté pintado antes de restaurar
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            lenisRef.current?.scrollTo(y, { immediate: true })
          })
        })
        return
      }
    }

    if (lenis) {
      lenis.scrollTo(0, { immediate: true })
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname])

  return <>{children}</>
}
