import { Boton, Datos, Layout, Parrafo } from './_layout'

/**
 * Aviso a la casilla interna de que entró algo que espera respuesta:
 * una consulta corporativa, una postulación, una solicitud de crédito o un
 * alta de mayorista pendiente de aprobación.
 *
 * Es un mail de trabajo, no de marca: lo importante es que se pueda decidir
 * desde el preview del celular si hay que abrir el panel ahora o después.
 */
export default function AvisoInterno({
  titulo = 'Entró una solicitud nueva',
  resumen = 'Hay una solicitud esperando respuesta en el panel.',
  filas = [],
  urlPanel,
  textoBoton = 'Ver en el panel',
}: {
  titulo?: string
  resumen?: string
  filas?: [string, string | null | undefined][]
  urlPanel?: string
  textoBoton?: string
}) {
  return (
    <Layout preview={resumen} titulo={titulo}>
      <Parrafo>{resumen}</Parrafo>
      <Datos filas={filas} />
      {urlPanel ? <Boton href={urlPanel}>{textoBoton}</Boton> : null}
    </Layout>
  )
}
