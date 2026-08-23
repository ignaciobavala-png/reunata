import { Resend } from 'resend'

let _resend: Resend | null = null

export function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

export const EMAIL_FROM =
  process.env.RESEND_FROM_EMAIL ?? 'Reunata <onboarding@resend.dev>'
