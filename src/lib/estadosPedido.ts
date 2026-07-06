export const ESTADOS_PEDIDO: Record<string, { label: string; bg: string; text: string }> = {
  borrador:           { label: 'Borrador',           bg: '#88888822', text: '#888888' },
  pendiente_pago:     { label: 'Pendiente de pago',  bg: '#f59e0b22', text: '#f59e0b' },
  comprobante_subido: { label: 'Comprobante enviado', bg: '#6366f122', text: '#6366f1' },
  sena_confirmada:    { label: 'Seña confirmada',    bg: '#14b8a622', text: '#14b8a6' },
  pago_confirmado:    { label: 'Pago confirmado',    bg: '#0ea5e922', text: '#0ea5e9' },
  en_preparacion:     { label: 'En preparación',     bg: '#8b5cf622', text: '#8b5cf6' },
  enviado:            { label: 'Enviado',            bg: '#06b6d422', text: '#06b6d4' },
  entregado:          { label: 'Entregado',          bg: '#10b98122', text: '#10b981' },
  cancelado:          { label: 'Cancelado',           bg: '#ef444422', text: '#ef4444' },
}

// Pedidos que ya no tienen ninguna acción pendiente — el resto se considera "en proceso".
export const ESTADOS_FINALIZADOS = ['entregado', 'cancelado']

const ESTADO_DEFAULT = { bg: '#88888822', text: '#888' }

export function estadoLabel(estado: string): string {
  return ESTADOS_PEDIDO[estado]?.label ?? estado
}

export function estadoColor(estado: string): { bg: string; text: string } {
  return ESTADOS_PEDIDO[estado] ?? ESTADO_DEFAULT
}
