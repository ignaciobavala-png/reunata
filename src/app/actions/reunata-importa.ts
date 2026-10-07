'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { COOKIE_CONDICIONES_IMPORTA } from '@/lib/containers'

/**
 * "Entendido, ver productos". Solo recuerda que las condiciones ya se mostraron
 * para no ponerlas delante cada vez: el permiso lo sigue decidiendo
 * `puede_containers()` en la página, así que la cookie sola no abre nada.
 */
export async function aceptarCondicionesImporta() {
  const jar = await cookies()
  jar.set(COOKIE_CONDICIONES_IMPORTA, '1', {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    httpOnly: true,
  })
  redirect('/tienda/containers')
}
