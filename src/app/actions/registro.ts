'use server'

import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ROL_MINORISTA } from '@/lib/roles'
import { enviarMail, CASILLA_INTERNA, SITIO } from '@/lib/emails/enviar'
import AvisoInterno from '@/emails/aviso-interno'
import RegistroRecibido from '@/emails/registro-recibido'

interface RegistroInput {
  email: string
  password: string
  nombre: string
  telefono?: string
  rol: string
  razon_social?: string
  cuit_dni?: string
  direccion?: string
  localidad?: string
  sitio_web?: string
  puntos_venta?: number
  clientes_activos?: number
  next?: string
}

export async function registrarse(data: RegistroInput) {
  const supabase = await createClient()
  const serviceSupabase = createServiceClient()

  // El rol de un cliente es el slug de su canal. Se valida contra la tabla (y no
  // contra una lista fija) para que los canales nuevos del panel funcionen solos,
  // pero sin dejar que el cliente mande cualquier slug (ej. 'master').
  const { data: canal } = await serviceSupabase
    .from('canales')
    .select('id, categoria_comercial')
    .eq('slug', data.rol)
    .eq('activo', true)
    .maybeSingle()

  const esMinorista = data.rol === ROL_MINORISTA
  if (!canal || (!esMinorista && canal.categoria_comercial !== 'mayorista')) {
    return { error: 'Elegí un tipo de cliente válido.' }
  }

  // Alta sin mail de verificación, y así se queda (revisado el 07/09/2026, ya con
  // Resend como SMTP propio).
  //
  // El motivo original era que el mailer incluido de Supabase no entregaba a
  // clientes reales; ese motivo desapareció, pero volver a signUp() sigue sin
  // convenir: agregaría un bloqueo sin agregar control. Quien valida al mayorista
  // es una persona en el panel (`aprobado`), el minorista valida su mail al
  // recibir la confirmación del pedido, y el mail de "recibimos tu solicitud" que
  // sale acá abajo ya prueba la entrega —si rebota, queda registrado en Resend—
  // sin dejar a nadie esperando. Con signUp(), un mail demorado o en spam se
  // convierte en una venta perdida.
  const { error: createError, data: createData } = await serviceSupabase.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: {
      rol: data.rol,
      nombre: data.nombre,
    },
  })

  if (createError) {
    if (createError.message.includes('already') || createError.code === 'email_exists') {
      return { error: 'Este email ya está registrado.' }
    }
    return { error: createError.message }
  }

  const userId = createData.user?.id
  if (!userId) {
    return { error: 'Error al crear la cuenta. Intentalo de nuevo.' }
  }

  const profileUpdate: Record<string, unknown> = {
    nombre: data.nombre,
    telefono: data.telefono ?? null,
    rol: data.rol,
  }

  if (esMinorista) {
    // El mayorista NO recibe canal_id acá: el canal se asigna recién al aprobarlo
    // (aprobarCliente lo deriva del rol), porque el checkout usa canal_id para
    // resolver precios sin volver a mirar `aprobado`.
    profileUpdate.aprobado = true
    profileUpdate.canal_id = canal.id
  } else {
    profileUpdate.razon_social = data.razon_social ?? null
    profileUpdate.cuit_dni = data.cuit_dni ?? null
    profileUpdate.direccion = data.direccion ?? null
    profileUpdate.localidad = data.localidad ?? null
    profileUpdate.sitio_web = data.sitio_web ?? null
    profileUpdate.puntos_venta = data.puntos_venta ?? null
    profileUpdate.clientes_activos = data.clientes_activos ?? null
  }

  const { error: updateError } = await serviceSupabase
    .from('profiles')
    .upsert({ id: userId, ...profileUpdate })

  if (updateError) {
    console.error('[registro] upsert profiles error:', updateError)
    return { error: 'Cuenta creada pero hubo un error al guardar los datos.' }
  }

  // Solo el mayorista queda esperando aprobación, y esa espera es invisible si
  // nadie avisa: entra, no ve precios y cree que el registro falló. Va antes
  // del redirect() de abajo, que corta la ejecución lanzando una excepción.
  if (!esMinorista) {
    await enviarMail({
      to: data.email,
      subject: 'Recibimos tu solicitud de cuenta',
      react: RegistroRecibido({ nombre: data.nombre?.split(' ')[0] ?? 'Hola' }),
    })

    await enviarMail({
      to: CASILLA_INTERNA,
      subject: `Alta mayorista pendiente — ${data.razon_social || data.nombre}`,
      replyTo: data.email,
      react: AvisoInterno({
        titulo: 'Alta de mayorista para aprobar',
        resumen: `${data.razon_social || data.nombre} se registró y espera aprobación para operar.`,
        filas: [
          ['Razón social', data.razon_social ?? null],
          ['Contacto', data.nombre],
          ['Email', data.email],
          ['Teléfono', data.telefono ?? null],
          ['CUIT / DNI', data.cuit_dni ?? null],
          ['Localidad', data.localidad ?? null],
          ['Rol', data.rol],
        ],
        urlPanel: `${SITIO}/dashboard/admin/clientes`,
      }),
    })
  }

  // createUser no deja sesión (es admin API), así que se loguea acá con el cliente
  // normal para que escriba las cookies de sesión.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })

  if (signInError) {
    // La cuenta quedó creada: que entre a mano en vez de reintentar el registro.
    return { error: 'Cuenta creada. Ingresá con tu email y contraseña.' }
  }

  const destino = data.next?.startsWith('/') ? data.next : '/'
  redirect(destino)
}
