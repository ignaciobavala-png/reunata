import type { ReactElement } from 'react'
import { getResend, EMAIL_FROM } from '@/lib/resend'

/** Casilla interna a la que llegan los avisos de "entró algo nuevo". */
export const CASILLA_INTERNA =
  process.env.EMAIL_AVISOS_INTERNOS ?? 'bombillas@reunata.com.ar'

export const SITIO = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.reunata.com.ar'

/**
 * Envía un mail sin poder romper la operación que lo disparó.
 *
 * Un pedido confirmado, una postulación guardada o una cuenta aprobada son
 * hechos consumados: si Resend está caído o la API key falta, el usuario no
 * tiene por qué ver un error ni perder lo que hizo. El fallo queda en los logs.
 *
 * Por eso se llama SIEMPRE después de que la escritura en la base salió bien,
 * nunca antes ni en paralelo.
 */
export async function enviarMail(opciones: {
  to: string | string[]
  subject: string
  react: ReactElement
  replyTo?: string
}): Promise<{ ok: boolean }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY sin configurar, no se envió:', opciones.subject)
    return { ok: false }
  }

  try {
    const { error } = await getResend().emails.send({
      from: EMAIL_FROM,
      to: opciones.to,
      subject: opciones.subject,
      react: opciones.react,
      // Por defecto contesta a la casilla real: el remitente es no-responder@,
      // así que sin esto cualquier respuesta de un cliente se pierde.
      replyTo: opciones.replyTo ?? CASILLA_INTERNA,
    })

    if (error) {
      console.error('[email] Resend rechazó el envío:', opciones.subject, error)
      return { ok: false }
    }
    return { ok: true }
  } catch (e) {
    console.error('[email] excepción al enviar:', opciones.subject, e)
    return { ok: false }
  }
}
