import Link from 'next/link'
import { WHATSAPP_NUMERO } from '@/lib/whatsapp'
import { aceptarCondicionesImporta } from '@/app/actions/reunata-importa'

/**
 * Condiciones de REUNATA importa. Se muestran al entrar desde el banner de la
 * home (Gastón, 07/10/2026): quien tiene permiso sigue a los productos, quien
 * no lo tiene pide acceso.
 *
 * BORRADOR: el texto lo armamos a partir de cómo funciona hoy la preventa
 * (etapas, rampa de precio, un solo pago, fecha aproximada). Falta que Gastón
 * lo revise. Vive todo en CONDICIONES para cambiarlo en un solo lugar.
 */
const CONDICIONES: { titulo: string; texto: string }[] = [
  {
    titulo: 'Comprás antes de que llegue',
    texto: 'Estos productos vienen en un próximo contenedor. Los pedís ahora y se entregan cuando llegan a nuestro depósito.',
  },
  {
    titulo: 'El precio depende de la etapa del viaje',
    texto: 'Mientras armamos el contenedor está el mejor precio. Con el barco en viaje, el descuento se achica de a poco hasta llegar al precio de la web. Tu precio queda fijo cuando confirmás el pedido.',
  },
  {
    titulo: 'La fecha de llegada es aproximada',
    texto: 'Cada producto muestra cuándo llega aproximadamente. Fabricación, flete y aduana pueden correrla.',
  },
  {
    titulo: 'Se paga como cualquier pedido',
    texto: 'Un solo pago, junto con lo que tengas de stock en el carrito.',
  },
  {
    titulo: 'Es un beneficio para cuentas habilitadas',
    texto: 'Las cantidades respetan el mínimo por bulto de tu cuenta.',
  },
]

type Modo =
  | { tipo: 'anonimo' }
  | { tipo: 'sin-permiso'; nombre: string | null }
  | { tipo: 'habilitado' }

export function ReunataImportaCondiciones({ modo }: { modo: Modo }) {
  const msg = encodeURIComponent(
    modo.tipo === 'sin-permiso' && modo.nombre
      ? `Hola, soy ${modo.nombre} y quiero pedir acceso a Reunata Importa.`
      : 'Hola, quiero pedir acceso a Reunata Importa.',
  )

  return (
    <div className="max-w-2xl">
      <ol className="flex flex-col gap-6 mb-10">
        {CONDICIONES.map((c, i) => (
          <li key={c.titulo} className="flex gap-4">
            <span
              className="text-sm tabular-nums flex-shrink-0 w-6"
              style={{ color: 'var(--color-acero-oscuro)' }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>{c.titulo}</p>
              <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>{c.texto}</p>
            </div>
          </li>
        ))}
      </ol>

      {modo.tipo === 'habilitado' ? (
        <form action={aceptarCondicionesImporta}>
          <button
            type="submit"
            className="w-full sm:w-auto px-8 py-3 text-xs tracking-widest uppercase"
            style={{ background: 'var(--color-granito-oscuro)', color: 'white' }}
          >
            Entendido, ver productos
          </button>
        </form>
      ) : modo.tipo === 'sin-permiso' ? (
        <div>
          <p className="text-sm mb-4" style={{ color: 'var(--foreground)' }}>
            Tu cuenta todavía no tiene acceso. Pedilo y te habilitamos.
          </p>
          <a
            href={`https://wa.me/${WHATSAPP_NUMERO}?text=${msg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block w-full sm:w-auto text-center px-8 py-3 text-xs tracking-widest uppercase"
            style={{ background: '#25D366', color: 'white' }}
          >
            Solicitar acceso por WhatsApp
          </a>
        </div>
      ) : (
        <div>
          <p className="text-sm mb-4" style={{ color: 'var(--foreground)' }}>
            Para pedir acceso necesitás una cuenta en Reunata.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={`/login?next=${encodeURIComponent('/tienda/containers')}`}
              className="text-center px-8 py-3 text-xs tracking-widest uppercase"
              style={{ background: 'var(--color-granito-oscuro)', color: 'white' }}
            >
              Ingresar
            </Link>
            <a
              href={`https://wa.me/${WHATSAPP_NUMERO}?text=${msg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center px-8 py-3 text-xs tracking-widest uppercase border"
              style={{ borderColor: 'var(--color-granito-oscuro)', color: 'var(--foreground)' }}
            >
              Consultar por WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
