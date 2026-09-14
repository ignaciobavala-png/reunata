import { Boton, Datos, Layout, Parrafo } from './_layout'

/**
 * Aviso al cliente de que su pedido cambió de estado.
 *
 * Un solo template para los tres estados que le importan al que compró: el
 * cuerpo cambia, el resto (marca, ficha del pedido, botón al detalle) es igual.
 * Los estados internos del panel no mandan mail — al cliente no le dicen nada.
 */

export type EstadoNotificable = 'pago_confirmado' | 'en_preparacion' | 'enviado'

const TEXTOS: Record<EstadoNotificable, { titulo: string; cuerpo: string }> = {
  pago_confirmado: {
    titulo: 'Confirmamos tu pago',
    cuerpo:
      'Ya registramos el pago de tu pedido. Lo preparamos y te avisamos cuando salga.',
  },
  en_preparacion: {
    titulo: 'Estamos preparando tu pedido',
    cuerpo: 'Tu pedido está en preparación. Te escribimos de nuevo cuando lo despachemos.',
  },
  enviado: {
    titulo: 'Tu pedido está en camino',
    cuerpo: 'Despachamos tu pedido. Abajo están los datos para seguirlo.',
  },
}

/** Una línea del pedido que viene en barco: qué es y cuándo llega. */
export interface LineaPreventa {
  titulo: string
  cantidad: number
  demora: string
}

export default function PedidoEstado({
  estado = 'pago_confirmado',
  nombre = 'Hola',
  numero,
  total,
  envio,
  tracking,
  urlPedido,
  preventa = [],
}: {
  estado?: EstadoNotificable
  nombre?: string
  numero?: string | number | null
  total?: string | null
  envio?: string | null
  tracking?: string | null
  urlPedido?: string
  preventa?: LineaPreventa[]
}) {
  const { titulo, cuerpo } = TEXTOS[estado] ?? TEXTOS.pago_confirmado

  return (
    <Layout preview={titulo} titulo={titulo}>
      <Parrafo>
        {nombre}, {cuerpo}
      </Parrafo>
      <Datos
        filas={[
          ['Pedido', numero ? `#${numero}` : null],
          ['Total', total],
          ['Envío', envio],
          ['Seguimiento', tracking],
        ]}
      />

      {/* La demora va en el mail y no solo en la web: es el único lugar al que el
          cliente vuelve a mirar sin que le pidamos que entre a ningún lado, y si
          no está acá el reclamo por "¿dónde está mi pedido?" llega igual. */}
      {preventa.length > 0 ? (
        <>
          <Parrafo>
            <strong>Parte de tu pedido viene en camino desde el exterior.</strong> Eso
            no frena el resto: cada producto llega en su fecha aproximada.
          </Parrafo>
          <Datos
            filas={preventa.map(l => [`${l.cantidad} × ${l.titulo}`, l.demora] as [string, string])}
          />
        </>
      ) : null}

      {urlPedido ? <Boton href={urlPedido}>Ver mi pedido</Boton> : null}
    </Layout>
  )
}
