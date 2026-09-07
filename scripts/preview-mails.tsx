/**
 * Arma un HTML autocontenido con todas las piezas de correo, para revisarlas
 * sin levantar nada y podérselas mandar a Reunata.
 *
 *   pnpm mails:preview  →  ~/Escritorio/reunata-mails.html
 *
 * Cada pieza va en su propio <iframe srcdoc>: un mail trae su propio <html> y
 * estilos pensados para ser el documento entero, así que pegados en la misma
 * página se pisan entre sí. El iframe le da a cada uno el documento aislado que
 * va a tener en el cliente de correo real.
 */
import { render } from 'react-email'
import { readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import AvisoInterno from '../src/emails/aviso-interno'
import CuentaActivada from '../src/emails/cuenta-activada'
import PedidoEstado from '../src/emails/pedido-estado'
import RegistroRecibido from '../src/emails/registro-recibido'

const SITIO = 'https://www.reunata.com.ar'

type Pieza = {
  titulo: string
  para: string
  cuando: string
  asunto: string
  html: string | Promise<string>
}

/**
 * La plantilla de recuperación no es un template de React: vive en Supabase,
 * porque la manda GoTrue y no la app. Se lee del archivo que la refleja y se
 * reemplazan las variables del motor de plantillas por valores de muestra.
 */
function plantillaSupabase(archivo: string): string {
  const ruta = join(process.cwd(), 'docs', 'emails', `supabase-${archivo}.html`)
  return readFileSync(ruta, 'utf8')
    .replaceAll('{{ .RedirectTo }}', `${SITIO}/auth/confirm`)
    .replaceAll('{{ .TokenHash }}', '5f3a9c2e8b1d4f7a6c0e9b2d5a8f1c4e')
    .replaceAll('{{ .NewEmail }}', 'nuevo@sucomercio.com.ar')
}

const piezas: Pieza[] = [
  {
    titulo: 'Restablecer contraseña',
    para: 'Cliente',
    cuando: 'Cuando pide "olvidé mi contraseña" desde el login.',
    asunto: 'cambiar contraseña Reunata',
    html: plantillaSupabase('recovery'),
  },
  {
    titulo: 'Invitación al panel',
    para: 'Empleado o comisionista',
    cuando: 'Cuando lo invitan desde el panel de empleados. Elige su contraseña con este link.',
    asunto: 'Te invitamos a Reunata',
    html: plantillaSupabase('invite'),
  },
  {
    titulo: 'Recibimos tu solicitud',
    para: 'Mayorista que se registra',
    cuando: 'Al terminar el registro. Su cuenta existe pero todavía no opera.',
    asunto: 'Recibimos tu solicitud de cuenta',
    html: render(RegistroRecibido({ nombre: 'Gastón' })),
  },
  {
    titulo: 'Cuenta activada',
    para: 'Mayorista aprobado',
    cuando: 'Cuando un admin lo aprueba desde el panel de clientes.',
    asunto: 'Tu cuenta de Reunata ya está activa',
    html: render(CuentaActivada({ nombre: 'Gastón', sitio: SITIO })),
  },
  {
    titulo: 'Pago confirmado',
    para: 'Cliente que compró',
    cuando: 'Al confirmar el pago, sea a mano en el panel o por Mercado Pago.',
    asunto: 'Pedido #1042 — actualización',
    html: render(
      PedidoEstado({
        estado: 'pago_confirmado',
        nombre: 'Sofía',
        numero: 1042,
        total: '$ 284.500',
        envio: 'Envío a domicilio — CABA',
        urlPedido: `${SITIO}/pedidos/ejemplo`,
      }),
    ),
  },
  {
    titulo: 'En preparación',
    para: 'Cliente que compró',
    cuando: 'Cuando el pedido pasa a preparación en el panel.',
    asunto: 'Pedido #1042 — actualización',
    html: render(
      PedidoEstado({
        estado: 'en_preparacion',
        nombre: 'Sofía',
        numero: 1042,
        total: '$ 284.500',
        envio: 'Envío a domicilio — CABA',
        urlPedido: `${SITIO}/pedidos/ejemplo`,
      }),
    ),
  },
  {
    titulo: 'Pedido enviado',
    para: 'Cliente que compró',
    cuando: 'Al despacharlo. Lleva el número de seguimiento real de Enviopack.',
    asunto: 'Tu pedido #1042 está en camino',
    html: render(
      PedidoEstado({
        estado: 'enviado',
        nombre: 'Sofía',
        numero: 1042,
        total: '$ 284.500',
        envio: 'Andreani — Envío a domicilio',
        tracking: '360000123456789',
        urlPedido: `${SITIO}/pedidos/ejemplo`,
      }),
    ),
  },
  {
    titulo: 'Aviso interno — consulta corporativa',
    para: 'bombillas@reunata.com.ar',
    cuando: 'Cuando una empresa completa el formulario de regalos corporativos.',
    asunto: 'Consulta corporativa — Estudio Lemos',
    html: render(
      AvisoInterno({
        titulo: 'Consulta corporativa nueva',
        resumen: 'Carla Ruiz escribió por Estudio Lemos.',
        filas: [
          ['Empresa', 'Estudio Lemos'],
          ['Contacto', 'Carla Ruiz'],
          ['Email', 'carla@estudiolemos.com'],
          ['Teléfono', '11 5555-4321'],
          ['Ocasión', 'Fin de año'],
          ['Cantidades', '120'],
          ['Fecha límite', '2026-11-20'],
        ],
        urlPanel: `${SITIO}/dashboard/admin/corporativos`,
      }),
    ),
  },
  {
    titulo: 'Aviso interno — alta de mayorista',
    para: 'bombillas@reunata.com.ar',
    cuando: 'Cuando un mayorista se registra y queda esperando aprobación.',
    asunto: 'Alta mayorista pendiente — Regalos del Sur SRL',
    html: render(
      AvisoInterno({
        titulo: 'Alta de mayorista para aprobar',
        resumen: 'Regalos del Sur SRL se registró y espera aprobación para operar.',
        filas: [
          ['Razón social', 'Regalos del Sur SRL'],
          ['Contacto', 'Gastón Pereyra'],
          ['Email', 'compras@regalosdelsur.com.ar'],
          ['Teléfono', '11 4444-8888'],
          ['CUIT / DNI', '30-71234567-4'],
          ['Localidad', 'Bahía Blanca'],
          ['Rol', 'mayorista'],
        ],
        urlPanel: `${SITIO}/dashboard/admin/clientes`,
      }),
    ),
  },
  {
    titulo: 'Aviso interno — postulación',
    para: 'bombillas@reunata.com.ar',
    cuando: 'Cuando alguien se postula (puesto, comisionista o proveedor).',
    asunto: 'Postulación — Comisionista: Julián Bravo',
    html: render(
      AvisoInterno({
        titulo: 'Postulación nueva',
        resumen: 'Julián Bravo se postuló como Comisionista.',
        filas: [
          ['Tipo', 'Comisionista'],
          ['Nombre', 'Julián Bravo'],
          ['Email', 'julian.bravo@gmail.com'],
          ['CV', 'Adjuntó archivo'],
        ],
        urlPanel: `${SITIO}/dashboard/admin/postulaciones`,
      }),
    ),
  },
  {
    titulo: 'Aviso interno — solicitud de crédito',
    para: 'bombillas@reunata.com.ar',
    cuando: 'Cuando un mayorista pide una línea de crédito desde su cuenta.',
    asunto: 'Solicitud de crédito — Regalos del Sur SRL',
    html: render(
      AvisoInterno({
        titulo: 'Solicitud de crédito nueva',
        resumen: 'Regalos del Sur SRL pidió una línea de crédito.',
        filas: [
          ['Cliente', 'Regalos del Sur SRL'],
          ['Email', 'compras@regalosdelsur.com.ar'],
          ['Monto', '1.500.000'],
          ['Referencias', '3 cargadas'],
          ['Garantías', 'Pagaré a la vista'],
        ],
        urlPanel: `${SITIO}/dashboard/admin/financiacion`,
      }),
    ),
  },
  {
    titulo: 'Confirmar cuenta',
    para: 'Cliente que se registra',
    cuando: 'Preparado, pero hoy no se usa: el registro ya crea la cuenta confirmada.',
    asunto: 'Confirmá tu cuenta de Reunata',
    html: plantillaSupabase('confirmation'),
  },
  {
    titulo: 'Cambio de email',
    para: 'Cliente que cambia su mail',
    cuando: 'Preparado para cuando la cuenta permita cambiar el mail de acceso.',
    asunto: 'Confirmá tu nuevo email',
    html: plantillaSupabase('email-change'),
  },
  {
    titulo: 'Link de acceso',
    para: 'Cliente',
    cuando: 'Preparado por si se habilita entrar sin contraseña. Hoy no se usa.',
    asunto: 'Tu link de acceso a Reunata',
    html: plantillaSupabase('magic-link'),
  },
]

const escapar = (s: string) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

const main = async () => {
  const resueltas = await Promise.all(
    piezas.map(async (p) => ({ ...p, html: await p.html })),
  )

  const secciones = resueltas
    .map(
      (p, i) => `
    <section class="pieza">
      <header>
        <span class="n">${String(i + 1).padStart(2, '0')}</span>
        <div>
          <h2>${p.titulo}</h2>
          <p class="meta"><strong>Para:</strong> ${p.para} &nbsp;·&nbsp; <strong>Asunto:</strong> ${p.asunto}</p>
          <p class="cuando">${p.cuando}</p>
        </div>
      </header>
      <iframe srcdoc="${escapar(p.html)}"></iframe>
    </section>`,
    )
    .join('\n')

  const doc = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Reunata — mails automáticos</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 48px 20px 80px;
    background: #E8EAED; color: #0D0F11;
    font: 15px/1.6 -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
  }
  .wrap { max-width: 760px; margin: 0 auto; }
  h1 { font-family: Georgia, 'Times New Roman', serif; font-size: 32px; font-weight: 400; margin: 0 0 8px; }
  .intro { color: #5A636E; margin: 0 0 12px; }
  .intro strong { color: #0D0F11; }
  .aclaracion { color: #6E7882; font-size: 13px; margin: 0 0 40px; padding-top: 16px; border-top: 1px solid #CFD4DA; }
  .pieza { margin: 0 0 40px; background: #fff; border: 1px solid #CFD4DA; }
  .pieza header { display: flex; gap: 16px; padding: 20px 24px; border-bottom: 1px solid #E8EAED; }
  .n { font-family: Georgia, serif; font-size: 13px; color: #A8B0BB; padding-top: 3px; }
  h2 { font-family: Georgia, 'Times New Roman', serif; font-size: 19px; font-weight: 400; margin: 0 0 6px; }
  .meta { margin: 0 0 4px; font-size: 12.5px; color: #5A636E; }
  .meta strong { color: #0D0F11; font-weight: 600; }
  .cuando { margin: 0; font-size: 13px; color: #6E7882; }
  iframe { display: block; width: 100%; border: 0; background: #F0F1F3; }
  @media (max-width: 600px) { body { padding: 28px 12px 60px; } .pieza header { padding: 16px; } }
</style>
</head>
<body>
<div class="wrap">
  <h1>Mails automáticos</h1>
  <p class="intro">Así se ven las <strong>${resueltas.length} piezas</strong> que el sitio manda solo. Los datos son de muestra: los nombres, números de pedido y montos salen de la base en el mail real.</p>
  <p class="aclaracion">Los que dicen <em>bombillas@reunata.com.ar</em> son avisos internos, para que no haya que entrar al panel a ver si entró algo nuevo. El resto los recibe el cliente.</p>
  ${secciones}
</div>
<script>
  // El iframe no se ajusta solo al alto de su contenido. Como el HTML entra por
  // srcdoc, es del mismo origen y se puede medir. Sin loading="lazy": un iframe
  // diferido no dispara load hasta que se scrollea hasta él, y queda recortado.
  const ajustar = (f) => {
    const d = f.contentDocument;
    if (!d || !d.body) return;
    f.style.height = Math.max(d.documentElement.scrollHeight, d.body.scrollHeight) + 'px';
  };
  const ajustarTodos = () => document.querySelectorAll('iframe').forEach(ajustar);

  // Se remide varias veces a propósito: con diez iframes, el load de los últimos
  // llega antes de que su documento tenga layout, y quedan cortados.
  document.querySelectorAll('iframe').forEach((f) => f.addEventListener('load', () => ajustar(f)));
  window.addEventListener('load', ajustarTodos);
  window.addEventListener('resize', ajustarTodos);
  [0, 200, 600, 1500].forEach((ms) => setTimeout(ajustarTodos, ms));
</script>
</body>
</html>`

  const salida = join(homedir(), 'Escritorio', 'reunata-mails.html')
  writeFileSync(salida, doc, 'utf8')
  console.log(`${resueltas.length} piezas → ${salida}`)
}

main()
