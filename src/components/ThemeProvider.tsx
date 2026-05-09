'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const CLAVES = [
  'diseno_acero_brillo',
  'diseno_acero_claro',
  'diseno_acero',
  'diseno_acero_oscuro',
  'diseno_granito_claro',
  'diseno_granito',
  'diseno_granito_oscuro',
  'diseno_background',
]

const CSS_VAR_MAP: Record<string, string> = {
  diseno_acero_brillo: '--color-acero-brillo',
  diseno_acero_claro: '--color-acero-claro',
  diseno_acero: '--color-acero',
  diseno_acero_oscuro: '--color-acero-oscuro',
  diseno_granito_claro: '--color-granito-claro',
  diseno_granito: '--color-granito',
  diseno_granito_oscuro: '--color-granito-oscuro',
  diseno_background: '--background',
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const supabase = createClient()

    supabase
      .from('configuracion')
      .select('clave, valor')
      .in('clave', CLAVES)
      .then(({ data }) => {
        if (!data?.length) return
        const root = document.documentElement
        for (const row of data) {
          if (row.valor) {
            const cssVar = CSS_VAR_MAP[row.clave]
            if (cssVar) root.style.setProperty(cssVar, row.valor)
          }
        }
      })
  }, [])

  return <>{children}</>
}
