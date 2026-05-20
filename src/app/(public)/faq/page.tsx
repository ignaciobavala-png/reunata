export const dynamic = 'force-dynamic'

import Link from 'next/link'
import Image from 'next/image'
import { ImageIcon } from 'lucide-react'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Preguntas frecuentes — Reunata' }

interface FaqItem { pregunta: string; respuesta: string }

function FotoLateral({ path, supabaseUrl }: { path: string | null; supabaseUrl: string }) {
  if (!path) return (
    <div className="hidden lg:flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed min-h-[400px] px-6 py-12 text-center"
      style={{ borderColor: 'var(--color-granito-claro)', background: 'var(--color-acero-brillo)', color: 'var(--color-acero-oscuro)' }}
    >
      <ImageIcon size={40} strokeWidth={1} />
    </div>
  )
  return (
    <div className="hidden lg:block relative rounded-2xl overflow-hidden min-h-[400px]">
      <Image
        src={`${supabaseUrl}/storage/v1/object/public/multimedia/${path}`}
        alt=""
        fill
        className="object-cover"
        sizes="280px"
      />
    </div>
  )
}

export default async function FaqPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabase = createServiceClient()
  const { data: rows } = await supabase
    .from('configuracion')
    .select('clave, valor')
    .in('clave', ['faq_items', 'faq_foto_izquierda', 'faq_foto_derecha'])

  const cfg: Record<string, string> = {}
  for (const r of rows ?? []) cfg[r.clave] = r.valor

  let items: FaqItem[] = []
  try { items = JSON.parse(cfg['faq_items'] ?? '[]') } catch { items = [] }

  const fotoIzquierda = cfg['faq_foto_izquierda'] || null
  const fotoDerecha   = cfg['faq_foto_derecha']   || null

  return (
    <div className="min-h-screen">
      <div className="px-6 md:px-16 max-w-7xl mx-auto">
        <section className="pt-36 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-8 lg:gap-12 items-start">
            <FotoLateral path={fotoIzquierda} supabaseUrl={supabaseUrl} />

            <div>
              <p className="text-xs tracking-widest uppercase mb-5" style={{ color: 'var(--color-acero-oscuro)' }}>
                FAQ
              </p>
              <h1 className="text-4xl md:text-6xl leading-tight mb-10" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
                Preguntas frecuentes.
              </h1>

              {items.length > 0 ? (
                <div className="flex flex-col gap-0 mb-12">
                  {items.map((item, i) => (
                    <details
                      key={i}
                      className="group border-b py-5 cursor-pointer"
                      style={{ borderColor: 'var(--color-granito-claro)' }}
                    >
                      <summary className="flex items-center justify-between gap-4 list-none text-base font-semibold select-none"
                        style={{ color: 'var(--foreground)' }}>
                        {item.pregunta}
                        <span className="flex-shrink-0 text-lg transition-transform group-open:rotate-45" style={{ color: 'var(--color-acero-oscuro)' }}>+</span>
                      </summary>
                      <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--color-granito-oscuro)' }}>
                        {item.respuesta}
                      </p>
                    </details>
                  ))}
                </div>
              ) : (
                <>
                  <p className="text-base md:text-lg max-w-xl leading-relaxed mb-4" style={{ color: 'var(--color-granito-oscuro)' }}>
                    Estamos preparando las respuestas a las preguntas más habituales sobre pedidos, envíos, condiciones mayoristas y productos.
                  </p>
                  <p className="text-base max-w-xl leading-relaxed mb-10" style={{ color: 'var(--color-acero-oscuro)' }}>
                    Mientras tanto, cualquier duda la resolvemos directo. No hay chatbot: hay personas.
                  </p>
                </>
              )}

              <div className="flex flex-wrap gap-3">
                <a
                  href="https://wa.me/5491132720974"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 text-sm font-medium rounded-full transition-colors duration-200"
                  style={{ background: 'var(--foreground)', color: 'var(--color-acero-claro)' }}
                >
                  Consultar por WhatsApp
                </a>
                <Link
                  href="/contacto"
                  className="px-6 py-3 text-sm font-medium rounded-full border transition-colors duration-200"
                  style={{ borderColor: 'var(--color-granito-claro)', color: 'var(--color-granito-oscuro)' }}
                >
                  Formulario de contacto
                </Link>
              </div>
            </div>

            <FotoLateral path={fotoDerecha} supabaseUrl={supabaseUrl} />
          </div>
        </section>
      </div>
    </div>
  )
}
