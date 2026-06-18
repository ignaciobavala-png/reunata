'use server'

import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'

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
  }

  if (data.rol === 'consumidor_final') {
    profileUpdate.aprobado = true
    const { data: canal } = await serviceSupabase
      .from('canales')
      .select('id')
      .eq('slug', 'consumidor_final')
      .single()
    if (canal) profileUpdate.canal_id = canal.id
  }

  if (data.rol !== 'consumidor_final') {
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
    return { error: 'Cuenta creada pero hubo un error al guardar los datos.' }
  }

  if (signUpData.session) {
    const destino = data.next?.startsWith('/') ? data.next : '/'
    redirect(destino)
  }

  redirect('/registro?confirmar=1')
}
