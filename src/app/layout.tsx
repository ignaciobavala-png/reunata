import type { Metadata } from 'next'
import { DM_Sans, DM_Serif_Display, DM_Mono } from 'next/font/google'
import { LenisProvider } from '@/providers/LenisProvider'
import { FloatingActions } from '@/components/sections/FloatingActions'
import { ThemeProvider } from '@/components/ThemeProvider'
import './globals.css'

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
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${dmSerif.variable} ${dmSans.variable} ${dmMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <LenisProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </LenisProvider>
        <FloatingActions />
      </body>
    </html>
  )
}
