'use client'

import { Download, FileText, Lock } from 'lucide-react'
import Link from 'next/link'

interface PdfItem {
  id: number
  titulo: string
  url: string
  created_at: string
  signedUrl: string | null
}

type Estado = 'ok' | 'sin_sesion' | 'sin_acceso' | 'pendiente'

interface Props {
  pdfs: PdfItem[]
  estado: Estado
}

export function CatalogoDescargas({ pdfs, estado }: Props) {
  return (
    <div className="px-6 md:px-16 max-w-4xl mx-auto py-16">
      <h1
        className="text-4xl md:text-5xl leading-tight mb-3"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}
      >
        Catálogos
      </h1>
      <p className="text-sm mb-10" style={{ color: 'var(--color-acero-oscuro)' }}>
        Descargá nuestros catálogos y listas de precios actualizadas.
      </p>

      {estado === 'sin_sesion' && (
        <Gate
          titulo="Iniciá sesión para acceder"
          descripcion="Los catálogos están disponibles para clientes registrados."
          cta={{ label: 'Iniciar sesión', href: '/login' }}
          ctaSecundario={{ label: 'Crear cuenta', href: '/registro' }}
        />
      )}

      {estado === 'sin_acceso' && (
        <Gate
          titulo="Acceso exclusivo para clientes mayoristas"
          descripcion="Para acceder a los catálogos necesitás una cuenta mayorista aprobada."
          cta={{ label: 'Contactanos', href: '/contacto' }}
        />
      )}

      {estado === 'pendiente' && (
        <Gate
          titulo="Tu cuenta está siendo revisada"
          descripcion="Cuando tu cuenta sea aprobada vas a poder descargar los catálogos y hacer pedidos."
          cta={{ label: 'Ir al inicio', href: '/' }}
        />
      )}

      {estado === 'ok' && pdfs.length === 0 && (
        <div
          className="rounded-xl border py-16 flex flex-col items-center gap-3"
          style={{ borderColor: 'var(--color-acero-claro)', borderStyle: 'dashed' }}
        >
          <FileText size={32} strokeWidth={1.2} style={{ color: 'var(--color-acero-claro)' }} />
          <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
            No hay catálogos disponibles por el momento.
          </p>
        </div>
      )}

      {estado === 'ok' && pdfs.length > 0 && (
        <div className="flex flex-col gap-3">
          {pdfs.map(pdf => (
            <div
              key={pdf.id}
              className="rounded-xl border px-5 py-4 flex items-center gap-4"
              style={{ borderColor: 'var(--color-acero-claro)', background: 'white' }}
            >
              <FileText
                size={22}
                strokeWidth={1.3}
                style={{ color: 'var(--color-acero-oscuro)', flexShrink: 0 }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  {pdf.titulo}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-acero-oscuro)' }}>
                  {new Date(pdf.created_at).toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <a
                href={pdf.signedUrl!}
                download
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium tracking-wide uppercase transition-opacity hover:opacity-75 flex-shrink-0"
                style={{ background: 'var(--foreground)', color: 'white' }}
              >
                <Download size={13} />
                Descargar
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Gate({
  titulo,
  descripcion,
  cta,
  ctaSecundario,
}: {
  titulo: string
  descripcion: string
  cta: { label: string; href: string }
  ctaSecundario?: { label: string; href: string }
}) {
  return (
    <div
      className="rounded-xl border py-14 px-8 flex flex-col items-center gap-4 text-center"
      style={{ borderColor: 'var(--color-acero-claro)' }}
    >
      <Lock size={28} strokeWidth={1.3} style={{ color: 'var(--color-acero-claro)' }} />
      <div>
        <p className="text-base font-medium mb-1" style={{ color: 'var(--foreground)' }}>
          {titulo}
        </p>
        <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
          {descripcion}
        </p>
      </div>
      <div className="flex items-center gap-3 mt-2">
        <Link
          href={cta.href}
          className="px-6 py-2.5 text-xs tracking-widest uppercase"
          style={{ background: 'var(--foreground)', color: 'white' }}
        >
          {cta.label}
        </Link>
        {ctaSecundario && (
          <Link
            href={ctaSecundario.href}
            className="text-xs tracking-widest uppercase hover:underline"
            style={{ color: 'var(--color-acero-oscuro)' }}
          >
            {ctaSecundario.label}
          </Link>
        )}
      </div>
    </div>
  )
}
