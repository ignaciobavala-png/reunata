-- Referencia de entrega opcional (entre calles, horario, portería, etc.).
-- Pedido del tester 2026-07-22: el cotizador solo pedía calle/número/piso y el
-- transportista no tenía cómo ubicar la dirección.
alter table public.pedidos
  add column if not exists envio_referencia text;

comment on column public.pedidos.envio_referencia is
  'Referencia libre para la entrega: entre calles, horario de recepción, portería. Opcional.';
