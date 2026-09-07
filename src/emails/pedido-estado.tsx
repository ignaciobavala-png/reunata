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

export default function PedidoEstado({
  estado = 'pago_confirmado',
  nombre = 'Hola',
  numero,
  total,
  envio,
  tracking,
  urlPedido,
}: {
  estado?: EstadoNotificable
  nombre?: string
  numero?: string | number | null
  total?: string | null
  envio?: string | null
  tracking?: string | null
  urlPedido?: string
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
      {urlPedido ? <Boton href={urlPedido}>Ver mi pedido</Boton> : null}
    </Layout>
  )
}
