-- Número visible de la reserva.
--
-- `pedidos` tiene `numero` desde 20260622162531 y es lo que el cliente nombra por
-- teléfono y Elena escribe en un papel. La reserva solo tenía un uuid, así que un
-- cliente con un pedido y una reserva al mismo tiempo no tenía forma de
-- distinguirlos al hablar — que es exactamente el caso que aparece cuando alguien
-- compra 400 mates de stock y reserva 300 bombillas del contenedor.
--
-- Secuencia propia y no compartida con pedidos: son documentos distintos y
-- mezclarlos en una sola numeración haría que ambas series tengan huecos.

create sequence if not exists public.container_reservas_numero_seq;

alter table public.container_reservas
  add column if not exists numero integer not null default nextval('public.container_reservas_numero_seq');

alter sequence public.container_reservas_numero_seq owned by public.container_reservas.numero;

comment on column public.container_reservas.numero is
  'Número visible de la reserva. Serie propia, independiente de pedidos.numero.';
