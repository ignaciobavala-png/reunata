'use server'

import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ROL_MINORISTA } from '@/lib/roles'

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

  // Alta sin mail de verificación (24/08). El SMTP nativo de Supabase solo entrega
  // a las direcciones del equipo del proyecto y tiene un rate limit de un puñado de
  // mails por hora, así que el link de confirmación no le llegaba a ningún cliente
  // real: se registraban y quedaban colgados en "revisá tu email". Quien valida es
  // el panel: el mayorista no opera hasta que un admin lo aprueba (`aprobado`) y el
  // minorista valida su mail implícitamente cuando recibe la confirmación del pedido.
  // Cuando el dominio esté verificado y Resend sea el SMTP, se puede volver a signUp().
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
