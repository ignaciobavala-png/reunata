import { Boton, Layout, Parrafo } from './_layout'

/** Al mayorista cuando un admin lo aprueba: recién ahí ve precios y puede comprar. */
export default function CuentaActivada({
  nombre = 'Hola',
  sitio = 'https://www.reunata.com.ar',
}: {
  nombre?: string
  sitio?: string
}) {
  return (
    <Layout preview="Tu cuenta mayorista ya está activa" titulo="Tu cuenta ya está activa">
      <Parrafo>
        {nombre}, ya podés entrar con tu email y tu contraseña. Vas a ver los
        precios y las condiciones de tu canal, y comprar directo desde el catálogo.
      </Parrafo>
      <Boton href={`${sitio}/login`}>Entrar a mi cuenta</Boton>
    </Layout>
  )
}
