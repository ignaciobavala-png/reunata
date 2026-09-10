import { Boton, Datos, Layout, Parrafo, COLORES } from './_layout'

/**
 * Acuse al cliente de que su reserva de preventa quedó registrada.
 *
 * No es un pedido y el mail tiene que dejarlo claro: la mercadería no está en el
 * depósito, la fecha es estimada y todavía falta que el equipo la confirme. Un
 * cliente que lo lea como si fuera una compra normal va a preguntar a los tres
 * días dónde está su paquete.
 *
 * Lleva el número de reserva bien arriba porque es lo que va a nombrar cuando
 * llame, y porque puede tener un pedido normal abierto al mismo tiempo.
 */
export default function ReservaRecibida({
  nombre = 'Hola',
  numero,
  viaje,
  etapa,
  fechaLlegada,
  descuentoPct,
  total,
  items = [],
  urlReservas,
}: {
  nombre?: string
  numero?: number | null
  viaje?: string | null
  etapa?: string | null
  fechaLlegada?: string | null
  descuentoPct?: number | null
  total?: string | null
  items?: string[]
  urlReservas?: string
}) {
  const titulo = numero ? `Reserva #${numero} registrada` : 'Reserva registrada'

  return (
    <Layout preview={`${titulo} — ${viaje ?? 'preventa de importados'}`} titulo={titulo}>
      <Parrafo>
        {nombre}, tomamos tu reserva de preventa. Esta mercadería <strong>todavía está en
        viaje</strong>: no sale del depósito ahora. Te vamos a contactar para confirmarla y
        acordar la forma de pago.
      </Parrafo>

      <Datos
        filas={[
          ['Reserva', numero ? `#${numero}` : null],
          ['Viaje', viaje],
          ['Estado del viaje', etapa],
          ['Llegada estimada', fechaLlegada],
          ['Descuento', descuentoPct ? `−${descuentoPct}% por reservar ahora` : null],
          ['Total', total],
        ]}
      />

      {items.length > 0 && (
        <ul style={{ margin: '0 0 24px', paddingLeft: '18px' }}>
          {items.map((linea, i) => (
            <li
              key={i}
              style={{ fontSize: '13px', color: COLORES.tinta, lineHeight: 1.7 }}
            >
              {linea}
            </li>
          ))}
        </ul>
      )}

      <Parrafo>
        La fecha de llegada depende del barco y puede moverse. Si se corre, te avisamos.
      </Parrafo>

      {urlReservas ? <Boton href={urlReservas}>Ver mis reservas</Boton> : null}
    </Layout>
  )
}
