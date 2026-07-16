// Fuente única de verdad para los métodos de pago: claves, labels y agrupado
// por IVA. La usan el drawer de configuración de canales (admin) y el carrito,
// para que los títulos coincidan en ambos lados (pedido del tester 2026-07-16).

export const METODOS_CON_IVA = ['transferencia_blanco', 'echeq_propio', 'echeq_al_dia', 'cheque_fisico_al_dia']
export const METODOS_SIN_IVA = ['efectivo', 'transferencia_negro']

export const METODO_LABEL: Record<string, string> = {
  mercado_pago:             'Mercado Pago',
  transferencia:            'Transferencia',
  efectivo:                 'Efectivo',
  transferencia_blanco:     'Transferencia (Factura A)',
  transferencia_negro:      'Transferencia Directa',
  echeq_al_dia:             'E-cheq al día',
  cheque_fisico_al_dia:     'Cheque físico al día',
  echeq_propio:             'E-cheq propio',
  echeq_tercero:            'E-cheq de tercero',
  cheque_fisico_financiado: 'Cheque físico',
}

// Abreviaturas para los tiles del carrito, donde el espacio es chico.
// Todo método sin entrada acá usa el label canónico.
const METODO_LABEL_CORTO: Record<string, string> = {
  transferencia_blanco: 'Transf. (Fac A)',
  transferencia_negro:  'Transf. Directa',
  cheque_fisico_al_dia: 'Cheque al día',
}

export function metodoLabelCorto(key: string): string {
  return METODO_LABEL_CORTO[key] ?? METODO_LABEL[key] ?? key
}
