import { Body, Container, Head, Html, Preview, Section, Text } from 'react-email'

/**
 * Layout institucional de los mails de Reunata.
 *
 * El diseño vive acá y no en cada template: los mails de auth (plantillas de
 * Supabase) usan estos mismos colores y tipografías, así que si cambia la marca
 * hay que tocar este archivo y las plantillas del dashboard, nada más.
 *
 * Reglas de correo, no de web: todo inline, tablas, sin position absoluto.
 */

export const COLORES = {
  fondo: '#F0F1F3',
  card: '#ffffff',
  borde: '#D4D9E0',
  tinta: '#0D0F11',
  negro: '#111316',
  texto: '#6E7882',
  suave: '#A8B0BB',
} as const

const serif = "Georgia,'Times New Roman',serif"
const sans = 'Arial,Helvetica,sans-serif'

export function Layout({
  preview,
  titulo,
  children,
}: {
  preview: string
  titulo: string
  children: React.ReactNode
}) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: COLORES.fondo, fontFamily: sans }}>
        <Container style={{ maxWidth: '520px', padding: '40px 16px' }}>
          <Section style={{ paddingBottom: '32px', textAlign: 'center' }}>
            <Text
              style={{
                margin: 0,
                fontFamily: serif,
                fontSize: '28px',
                letterSpacing: '0.04em',
                color: COLORES.negro,
              }}
            >
              Reunata
            </Text>
          </Section>

          <Section
            style={{
              backgroundColor: COLORES.card,
              border: `1px solid ${COLORES.borde}`,
              padding: '40px 40px 36px',
            }}
          >
            <Text
              style={{
                margin: '0 0 8px',
                fontFamily: serif,
                fontSize: '22px',
                color: COLORES.tinta,
                lineHeight: 1.3,
              }}
            >
              {titulo}
            </Text>
            {children}
          </Section>

          <Section style={{ paddingTop: '24px', textAlign: 'center' }}>
            <Text style={{ margin: 0, fontSize: '11px', color: COLORES.suave }}>
              © Reunata · reunata.com.ar
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export function Parrafo({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ margin: '0 0 20px', fontSize: '14px', color: COLORES.texto, lineHeight: 1.6 }}>
      {children}
    </Text>
  )
}

// React 19 sacó `bgcolor` de los tipos de <td>, pero es el atributo que leen los
// webmails que descartan CSS. Se pasa por spread para conservarlo en el HTML.
const FONDO_TD = { bgcolor: COLORES.negro } as unknown as React.TdHTMLAttributes<HTMLTableCellElement>

/**
 * Botón de mail. El fondo va en el `<a>` y en el `<td>` (bgcolor) porque hay
 * webmails que descartan el style del ancla: sin las dos cosas el botón llega
 * como texto pelado, que fue justo lo que pasó con el mail de recuperación.
 */
export function Boton({ href, children }: { href: string; children: string }) {
  return (
    <table cellPadding={0} cellSpacing={0} style={{ margin: '0 0 8px' }}>
      <tbody>
        <tr>
          <td {...FONDO_TD} style={{ backgroundColor: COLORES.negro }}>
            <a
              href={href}
              style={{
                display: 'inline-block',
                padding: '14px 32px',
                fontFamily: sans,
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#ffffff',
                backgroundColor: COLORES.negro,
                textDecoration: 'none',
              }}
            >
              {children}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

/** Ficha de datos clave-valor, para los avisos internos. */
export function Datos({ filas }: { filas: [string, string | null | undefined][] }) {
  return (
    <table cellPadding={0} cellSpacing={0} width="100%" style={{ margin: '0 0 24px' }}>
      <tbody>
        {filas
          .filter(([, valor]) => valor)
          .map(([etiqueta, valor]) => (
            <tr key={etiqueta}>
              <td
                style={{
                  padding: '8px 12px 8px 0',
                  fontSize: '11px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: COLORES.suave,
                  borderBottom: `1px solid ${COLORES.fondo}`,
                  verticalAlign: 'top',
                  whiteSpace: 'nowrap',
                }}
              >
                {etiqueta}
              </td>
              <td
                style={{
                  padding: '8px 0',
                  fontSize: '13px',
                  color: COLORES.tinta,
                  borderBottom: `1px solid ${COLORES.fondo}`,
                }}
              >
                {valor}
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  )
}
