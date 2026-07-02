-- El checkout por transferencia (src/app/actions/checkout.ts) inserta
-- medio_pago = 'transferencia', pero el CHECK original solo admitía
-- 'transferencia_blanco' / 'transferencia_cueva'. Todo pedido por
-- transferencia fallaba con "Error al crear el pedido".
alter table public.pedidos drop constraint pedidos_medio_pago_check;
alter table public.pedidos add constraint pedidos_medio_pago_check
  check (medio_pago = any (array[
    'efectivo'::text,
    'transferencia'::text,
    'transferencia_blanco'::text,
    'transferencia_cueva'::text,
    'echeq_propio'::text,
    'echeq_tercero'::text,
    'echeq_al_dia'::text,
    'cheque_propio'::text,
    'cheque_tercero'::text,
    'cuenta_corriente'::text,
    'mercadopago'::text
  ]));
