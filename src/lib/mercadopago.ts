import MercadoPagoConfig, { Preference, Payment } from 'mercadopago'

let _client: MercadoPagoConfig | null = null

function getClient(): MercadoPagoConfig {
  if (!_client) {
    const token = process.env.MP_ACCESS_TOKEN
    if (!token) throw new Error('MP_ACCESS_TOKEN no configurado')
    _client = new MercadoPagoConfig({ accessToken: token, options: { timeout: 5000 } })
  }
  return _client
}

export function getMPPreference() {
  return new Preference(getClient())
}

export function getMPPayment() {
  return new Payment(getClient())
}

export function isSandbox(): boolean {
  return (process.env.MP_ACCESS_TOKEN ?? '').startsWith('TEST-')
}
