import type { Metadata } from 'next'
import { DM_Sans, DM_Serif_Display, DM_Mono } from 'next/font/google'
import { LenisProvider } from '@/providers/LenisProvider'
import { FloatingActions } from '@/components/sections/FloatingActions'
import { ThemeProvider } from '@/components/ThemeProvider'
import { createServiceClient } from '@/lib/supabase/server'
import './globals.css'

const CSS_VAR_MAP: Record<string, string> = {
  diseno_acero_brillo:  '--color-acero-brillo',
  diseno_acero_claro:   '--color-acero-claro',
  diseno_acero:         '--color-acero',
  diseno_acero_oscuro:  '--color-acero-oscuro',
  diseno_granito_claro: '--color-granito-claro',
  diseno_granito:       '--color-granito',
  diseno_granito_oscuro:'--color-granito-oscuro',
  diseno_background:    '--background',
}

const dmSerif = DM_Serif_Display({
  variable: '--font-display',
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
})

const dmSans = DM_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
})

const dmMono = DM_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: {
    default: 'Reunata — El mate que te une',
    template: '%s | Reunata',
  },
  applicationName: 'Reunata',
  description:
    'Reunata importa los mejores mates, termos y accesorios. Productos seleccionados, diseño renovado, entrega en todo el país.',
  keywords: ['mate', 'mates', 'termos', 'yerbas', 'accesorios mate', 'reunata'],
  openGraph: {
    title: 'Reunata — El mate que te une',
    description: 'Los mejores mates, termos y accesorios importados.',
    siteName: 'Reunata',
    locale: 'es_AR',
    type: 'website',
  },
  verification: {
    google: 'TR3zjqW_qNkWaGtgrn8JiqEQIHJ8flbPeWJhN8Oia2Y',
  },
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = createServiceClient()
  const { data: themeRows } = await supabase
    .from('configuracion')
    .select('clave, valor')
    .in('clave', Object.keys(CSS_VAR_MAP))

  const themeVars = (themeRows ?? [])
    .filter(r => r.valor && CSS_VAR_MAP[r.clave])
    .map(r => `${CSS_VAR_MAP[r.clave]}:${r.valor}`)
    .join(';')

  return (
    <html
      lang="es"
      className={`${dmSerif.variable} ${dmSans.variable} ${dmMono.variable} h-full`}
    >
      {themeVars && (
        <style
          href="reunata-theme"
          precedence="default"
          dangerouslySetInnerHTML={{ __html: `:root{${themeVars}}` }}
        />
      )}
      <body className="min-h-full flex flex-col antialiased">
        <LenisProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </LenisProvider>
        <FloatingActions />
      </body>
    </html>
  )
}
