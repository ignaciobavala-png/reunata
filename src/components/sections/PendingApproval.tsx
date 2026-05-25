import { Clock } from 'lucide-react'

const WA_NUMBER = '5491132720974'
const WA_MSG = encodeURIComponent('Hola, me registré como mayorista y quiero saber el estado de mi solicitud.')

export function PendingApproval({ nombre }: { nombre?: string | null }) {
  return (
    <div
      className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--background)' }}
    >
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-8"
        style={{ background: 'var(--color-acero-claro)' }}
      >
        <Clock size={36} style={{ color: 'var(--color-granito)' }} />
      </div>

      <p className="text-xs tracking-widest uppercase mb-4" style={{ color: 'var(--color-acero-oscuro)' }}>
        Solicitud recibida
      </p>

      <h1
        className="text-3xl md:text-4xl mb-4 max-w-lg"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}
      >
        {nombre ? `Hola ${nombre},` : 'Tu solicitud'} está siendo revisada
      </h1>

      <p className="text-base max-w-md mb-10" style={{ color: 'var(--color-acero-oscuro)', lineHeight: '1.7' }}>
        Recibimos tu formulario de registro. Nuestro equipo comercial lo está revisando y te
        va a contactar a la brevedad para activar tu cuenta y darte acceso al catálogo con
        precios mayoristas.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <a
          href={`https://wa.me/${WA_NUMBER}?text=${WA_MSG}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-8 py-3 text-xs tracking-widest uppercase transition-colors"
          style={{ background: '#25D366', color: 'white' }}
        >
          Consultar por WhatsApp
        </a>
        <a
          href="/cuenta"
          className="text-xs tracking-widest uppercase hover:underline"
          style={{ color: 'var(--color-granito-claro)' }}
        >
          Ver mi cuenta
        </a>
      </div>
    </div>
  )
}
