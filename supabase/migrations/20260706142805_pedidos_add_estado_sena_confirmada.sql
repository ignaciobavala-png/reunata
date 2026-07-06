-- Agrega el estado intermedio para el sub-flujo de seña en efectivo:
-- pendiente_pago → sena_confirmada (10% recibido) → pago_confirmado (saldo).
-- Solo aplica cuando medio_pago = 'efectivo' (validado en actualizarEstadoPedido,
-- no en un CHECK cruzado de columnas). El % de seña es una constante en código
-- (ESTADOS_EDITABLES / TRANSICIONES_PERMITIDAS en src/app/actions/pedidos.ts),
-- no una config por canal.

ALTER TABLE public.pedidos DROP CONSTRAINT pedidos_estado_check;

ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_estado_check CHECK (estado = ANY (ARRAY[
  'borrador'::text,
  'pendiente_pago'::text,
  'comprobante_subido'::text,
  'sena_confirmada'::text,
  'pago_confirmado'::text,
  'en_preparacion'::text,
  'enviado'::text,
  'entregado'::text,
  'cancelado'::text
]));
