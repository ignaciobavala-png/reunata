import { Layout, Parrafo } from './_layout'

/**
 * Al mayorista que se acaba de registrar. Su cuenta existe pero no opera hasta
 * que un admin la aprueba, y sin este mail ese estado es invisible: entra,
 * no ve precios y cree que algo falló.
 */
export default function RegistroRecibido({
  nombre = 'Hola',
}: {
  nombre?: string
}) {
  return (
    <Layout
      preview="Recibimos tu solicitud de cuenta mayorista"
      titulo="Recibimos tu solicitud"
    >
      <Parrafo>
        {nombre}, tu cuenta quedó creada. Antes de habilitarla revisamos los datos
        del comercio, que es lo que nos permite mostrarte los precios y las
        condiciones que te corresponden.
      </Parrafo>
      <Parrafo>
        Te escribimos apenas esté lista. Si mientras tanto necesitás algo,
        respondé este mail y te contestamos.
      </Parrafo>
    </Layout>
  )
}
