-- Campo explícito de editabilidad, independiente del label de `estado`.
-- Hoy la única "edición" post-creación que existe es subir un comprobante;
-- editable=true mientras eso siga siendo posible (borrador, pendiente_pago,
-- comprobante_subido) y false desde que el pago queda confirmado en adelante
-- (incluido cancelado). Los 6 lugares que escriben `pedidos.estado` deben
-- mantener este campo sincronizado: src/app/actions/pedidos.ts,
-- src/app/actions/checkout.ts, src/app/api/mp/webhook/route.ts,
-- src/app/api/pedidos/limpiar/route.ts.

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS editable boolean NOT NULL DEFAULT true;

UPDATE public.pedidos
SET editable = false
WHERE estado IN ('pago_confirmado', 'en_preparacion', 'enviado', 'entregado', 'cancelado');
