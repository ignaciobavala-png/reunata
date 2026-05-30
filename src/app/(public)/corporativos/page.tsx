export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { CorporativosForm } from '@/components/sections/CorporativosForm'

export const metadata: Metadata = {
  title: 'Regalos corporativos',
  description: 'Kits de mates y accesorios personalizados para empresas. Regalos corporativos con identidad de marca para eventos y celebraciones.',
  alternates: { canonical: '/corporativos' },
}
import { createServiceClient } from '@/lib/supabase/server'

async function getFotos(): Promise<{ izquierda: string | null; derecha: string | null }> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('configuracion')
    .select('clave, valor')
    .in('clave', ['corporativos_foto_izquierda', 'corporativos_foto_derecha'])

  const map: Record<string, string> = {}
  for (const row of data ?? []) map[row.clave] = row.valor

  return {
    izquierda: map['corporativos_foto_izquierda'] || null,
    derecha: map['corporativos_foto_derecha'] || null,
  }
}

function FotoLateral({ path, supabaseUrl }: { path: string | null; supabaseUrl: string }) {
  if (!path) {
    return (
      <div className="hidden lg:flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed min-h-[400px] px-6 py-12 text-center"
        style={{ borderColor: 'var(--color-granito-claro)', background: 'var(--color-acero-brillo)', color: 'var(--color-acero-oscuro)' }}
      >
        <ImageIcon size={48} strokeWidth={1} />
        <div>
          <p className="text-sm font-semibold">Trabajos realizados</p>
          <p className="text-xs mt-1 opacity-70">Próximamente</p>
        </div>
      </div>
    )
  }

  return (
    <div className="hidden lg:block relative rounded-2xl overflow-hidden min-h-[400px]">
      <Image
        src={`${supabaseUrl}/storage/v1/object/public/multimedia/${path}`}
        alt="Trabajos realizados"
        fill
        className="object-cover"
        sizes="300px"
      />
    </div>
  )
}

export default async function CorporativosPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const fotos = await getFotos()

  return (
    <main className="bg-[var(--color-acero-claro)] pb-24">
      <div className="px-6 md:px-16 max-w-7xl mx-auto">

        {/* Hero */}
        <section className="pt-36 pb-16 border-b-2 border-[var(--color-granito-claro)]">
          <p className="text-sm tracking-widest uppercase mb-5 text-[var(--color-granito-oscuro)]">
            Hacé realidad tu marca
          </p>
          <h1
            className="text-4xl md:text-5xl leading-tight mb-8 text-[var(--color-granito-oscuro)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Corporativos
          </h1>
          <p className="text-lg max-w-2xl leading-relaxed text-[var(--color-granito-oscuro)]">
            Personalizamos productos con tu marca. Completá el formulario y te contactamos a la brevedad.
          </p>
        </section>

        {/* Contenido */}
        <section className="py-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-8 lg:gap-12 items-start">
            <FotoLateral path={fotos.izquierda} supabaseUrl={supabaseUrl} />
            <CorporativosForm />
            <FotoLateral path={fotos.derecha} supabaseUrl={supabaseUrl} />
          </div>
        </section>

      </div>
    </main>
  )
}
