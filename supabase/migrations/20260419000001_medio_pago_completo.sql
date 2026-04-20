-- Amplía el CHECK de medio_pago con los 9 métodos reales definidos por Gastón.
-- Los 3 valores originales (transferencia, efectivo, cheque) eran demasiado genéricos.

alter table public.pedidos drop constraint pedidos_medio_pago_check;

alter table public.pedidos add constraint pedidos_medio_pago_check check (
  medio_pago = ANY (ARRAY[
    'efectivo',
    'transferencia_blanco',
    'transferencia_cueva',
    'echeq_propio',
    'echeq_tercero',
    'cheque_propio',
    'cheque_tercero',
    'cuenta_corriente',
    'mercadopago'
  ])
);
