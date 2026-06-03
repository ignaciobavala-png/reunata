export const dynamic = 'force-dynamic'

import Image from 'next/image'
import Link from 'next/link'
import { ImageIcon, ExternalLink, Lock } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Banco de imágenes — Reunata' }

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

const ROLES_MAYORISTA = ['distribuidor', 'local', 'mercha']

export default async function BancoImagenesPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const service = createServiceClient()

  const [{ data: rows }, { data: { user } }] = await Promise.all([
    service.from('configuracion').select('clave, valor').in('clave', [
      'banco_imagenes_drive_url',
      'banco_imagenes_foto_izquierda',
      'banco_imagenes_foto_derecha',
    ]),
    (await createClient()).auth.getUser(),
  ])

  const cfg: Record<string, string> = {}
  for (const r of rows ?? []) cfg[r.clave] = r.valor

  const driveUrl      = cfg['banco_imagenes_drive_url']      || null
  const fotoIzquierda = cfg['banco_imagenes_foto_izquierda'] || null
  const fotoDerecha   = cfg['banco_imagenes_foto_derecha']   || null

  // Resolver acceso
  let acceso: 'publico' | 'pendiente' | 'mayorista' = 'publico'
  if (user) {
    const { data: profile } = await service
      .from('profiles')
      .select('rol, aprobado')
      .eq('id', user.id)
      .single()

    if (profile && ROLES_MAYORISTA.includes(profile.rol)) {
      acceso = profile.aprobado ? 'mayorista' : 'pendiente'
    }
  }

  return (
    <div className="min-h-screen">
      <div className="px-6 md:px-16 max-w-7xl mx-auto">
        <section className="pt-36 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-8 lg:gap-12 items-start">
            <FotoLateral path={fotoIzquierda} supabaseUrl={supabaseUrl} />

            <div>
              <p className="text-xs tracking-widest uppercase mb-5" style={{ color: 'var(--color-acero-oscuro)' }}>
                Banco de imágenes
              </p>
              <h1 className="text-4xl md:text-6xl leading-tight mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
                Imágenes para revendedores.
              </h1>

              {acceso === 'mayorista' ? (
                // ── Mayorista aprobado ──────────────────────────────────
                driveUrl ? (
                  <>
                    <p className="text-base md:text-lg max-w-xl leading-relaxed mb-8" style={{ color: 'var(--color-granito-oscuro)' }}>
                      Accedé al banco de imágenes de alta resolución de Reunata. Disponible para distribuidores, locales y revendedores.
                    </p>
                    <a
                      href={driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-8 py-4 text-base font-medium rounded-full transition-colors duration-200"
                      style={{ background: 'var(--foreground)', color: 'var(--color-acero-claro)' }}
                    >
                      Abrir banco de imágenes
                      <ExternalLink size={16} />
                    </a>
                  </>
                ) : (
                  <>
                    <p className="text-base md:text-lg max-w-xl leading-relaxed mb-4" style={{ color: 'var(--color-granito-oscuro)' }}>
                      Estamos preparando el banco de imágenes. En breve vas a poder descargarlo desde acá.
                    </p>
                    <p className="text-base max-w-xl leading-relaxed mb-10" style={{ color: 'var(--color-acero-oscuro)' }}>
                      Mientras tanto, escribinos y te enviamos las imágenes que necesités.
                    </p>
                    <a
                      href="https://wa.me/5491132720974"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 text-sm font-medium rounded-full transition-colors duration-200"
                      style={{ background: 'var(--foreground)', color: 'var(--color-acero-claro)' }}
                    >
                      Pedir imágenes por WhatsApp
                    </a>
                  </>
                )
              ) : acceso === 'pendiente' ? (
                // ── Mayorista pendiente de aprobación ──────────────────
                <>
                  <div
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
                    style={{ background: '#f59e0b22', color: '#f59e0b' }}
                  >
                    <Lock size={12} />
                    Cuenta pendiente de aprobación
                  </div>
                  <p className="text-base md:text-lg max-w-xl leading-relaxed mb-4" style={{ color: 'var(--color-granito-oscuro)' }}>
                    Tu cuenta mayorista está siendo revisada por nuestro equipo comercial.
                  </p>
                  <p className="text-base max-w-xl leading-relaxed mb-10" style={{ color: 'var(--color-acero-oscuro)' }}>
                    Una vez aprobada, vas a poder acceder al banco de imágenes desde acá. Si necesitás materiales urgente, escribinos.
                  </p>
                  <a
                    href="https://wa.me/5491132720974"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 text-sm font-medium rounded-full transition-colors duration-200"
                    style={{ background: 'var(--foreground)', color: 'var(--color-acero-claro)' }}
                  >
                    Contactar al equipo comercial
                  </a>
                </>
              ) : (
                // ── Sin sesión o consumidor final ───────────────────────
                <>
                  <p className="text-base md:text-lg max-w-xl leading-relaxed mb-4" style={{ color: 'var(--color-granito-oscuro)' }}>
                    El banco de imágenes está disponible exclusivamente para distribuidores, locales y revendedores de Reunata.
                  </p>
                  <p className="text-base max-w-xl leading-relaxed mb-10" style={{ color: 'var(--color-acero-oscuro)' }}>
                    Si ya sos revendedor, registrate como mayorista para acceder.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/registro?tab=mayorista"
                      className="px-6 py-3 text-sm font-medium rounded-full transition-colors duration-200"
                      style={{ background: 'var(--foreground)', color: 'var(--color-acero-claro)' }}
                    >
                      Quiero ser revendedor
                    </Link>
                    {!user && (
                      <Link
                        href="/login?next=/banco-imagenes"
                        className="px-6 py-3 text-sm font-medium rounded-full border transition-colors duration-200"
                        style={{ borderColor: 'var(--color-granito-claro)', color: 'var(--color-granito-oscuro)' }}
                      >
                        Ya tengo cuenta
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>

            <FotoLateral path={fotoDerecha} supabaseUrl={supabaseUrl} />
          </div>
        </section>
      </div>
    </div>
  )
}
