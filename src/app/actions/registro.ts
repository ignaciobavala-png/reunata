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

  const { error: signUpError, data: signUpData } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        rol: data.rol,
        nombre: data.nombre,
      },
    },
  })

  if (signUpError) {
    if (signUpError.message.includes('already')) {
      return { error: 'Este email ya está registrado.' }
    }
    return { error: signUpError.message }
  }

  const userId = signUpData.user?.id
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

  if (signUpData.session) {
    const destino = data.next?.startsWith('/') ? data.next : '/'
    redirect(destino)
  }

  redirect('/registro?confirmar=1')
}
