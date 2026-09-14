-- Preventa dentro del pedido normal — un solo carrito, un solo pago.
--
-- Decisión de Gastón del 14/09/2026: "va a ser un solo pago, como un pedido
-- normal. Lo único que tenemos que diferenciar es la demora en cada producto."
--
-- Eso cambia el modelo del beta: hasta ahora la preventa vivía en
-- `container_reservas`, una entidad paralela con su propio número, su propio
-- total y su propio circuito. A partir de acá una línea de preventa es
-- simplemente un `pedido_items` más, con dos datos extra: de qué ítem del viaje
-- salió y cuándo llega.
--
-- `container_reservas` NO se toca ni se borra: las reservas del beta siguen
-- vivas y el panel las sigue mostrando. Lo que deja de hacer es recibir altas
-- nuevas desde la tienda.
--
-- Lo que SÍ sigue siendo la fuente de verdad del stock del barco es
-- `container_items.comprometido`. Un pedido que toma mercadería del viaje tiene
-- que descontarla ahí, atómicamente, o dos clientes se llevan la misma unidad.
-- De ahí las dos funciones del final.

-- ---------------------------------------------------------------------------
-- La línea del pedido sabe de qué viaje viene y cuándo llega
-- ---------------------------------------------------------------------------
alter table public.pedido_items
  add column if not exists container_item_id bigint
    references public.container_items(id) on delete restrict,
  -- Fecha ESTIMADA de arribo, congelada al confirmar el pedido. Es una copia a
  -- propósito y no un join a `containers.fecha_arribo_est`: si el barco se
  -- demora, el cliente tiene que poder ver qué le prometimos cuando compró, y
  -- el aviso de la demora es una decisión de una persona, no un cambio callado
  -- en la pantalla de su pedido.
  add column if not exists fecha_estimada date,
  -- El % de etapa que se le aplicó a esta línea, ya con el piso del canal
  -- aplicado. Se guarda para poder auditar por qué esta línea salió más barata
  -- que la lista sin tener que reconstruir la etapa en la que estaba el viaje
  -- aquel día.
  add column if not exists descuento_etapa_pct numeric not null default 0;

comment on column public.pedido_items.container_item_id is
  'Ítem del viaje del que sale esta línea. null = mercadería de stock, se despacha ya.';
comment on column public.pedido_items.fecha_estimada is
  'Arribo estimado prometido al cliente, congelado al confirmar. null = stock.';

-- Buscar las líneas de preventa de un viaje (panel de Gastón) y liberar el
-- comprometido de un pedido son las dos consultas calientes.
create index if not exists pedido_items_container_item_idx
  on public.pedido_items (container_item_id)
  where container_item_id is not null;

-- ---------------------------------------------------------------------------
-- Piso duro de descuento por canal
-- ---------------------------------------------------------------------------
-- Gastón decidió que los descuentos se acumulan TODOS: al descuento de etapa se
-- le suma la cascada web → volumen → forma de pago. Para un distribuidor en
-- etapa China eso da del orden de −35% sobre lista.
--
-- Esto es la red: el precio efectivo de una línea de preventa nunca baja del
-- `piso_descuento_pct` del canal. null = sin piso, que es el default y el
-- comportamiento que Gastón pidió. Se apaga la red solo si alguien la enciende.
alter table public.canales_config
  add column if not exists piso_descuento_pct numeric
    check (piso_descuento_pct is null or (piso_descuento_pct >= 0 and piso_descuento_pct < 100));

comment on column public.canales_config.piso_descuento_pct is
  'Descuento total máximo (%) que puede acumular una línea de preventa sumando etapa + cascada. null = sin tope.';

-- ---------------------------------------------------------------------------
-- Comprometer el stock del viaje al confirmar el pedido
-- ---------------------------------------------------------------------------
-- Misma puerta única que `container_reservar`, con la misma razón: si el alta de
-- la línea y el descuento del comprometido fueran dos pasos, dos clientes
-- simultáneos se llevan la misma unidad y el barco llega corto.
--
-- Acá el pedido ya existe y sus líneas ya están escritas: lo que hace esta
-- función es tomar el lock, verificar que alcanza, y descontar. Si no alcanza
-- levanta excepción y el caller borra el pedido.
create or replace function public.preventa_comprometer(p_pedido_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  it record;
begin
  -- Ordenado por id: dos pedidos simultáneos que tocan los mismos ítems toman
  -- los locks en el mismo orden y no se trencan.
  for it in
    select pi.container_item_id as item_id, sum(pi.cantidad)::integer as cantidad
      from public.pedido_items pi
     where pi.pedido_id = p_pedido_id
       and pi.container_item_id is not null
     group by pi.container_item_id
     order by pi.container_item_id
  loop
    perform 1 from public.container_items where id = it.item_id for update;

    if not found then
      raise exception 'El ítem % del viaje ya no existe', it.item_id;
    end if;

    update public.container_items
       set comprometido = comprometido + it.cantidad
     where id = it.item_id
       and cantidad - comprometido >= it.cantidad;

    if not found then
      raise exception 'No queda suficiente de uno de los productos en preventa. Actualizá el carrito y probá de nuevo.';
    end if;
  end loop;
end;
$$;

-- Solo el server. No se le da a `authenticated` a propósito: la función no
-- verifica dueño —el pedido ya viene validado por crearPedidoBorrador— así que
-- expuesta en /rest/v1/rpc cualquier usuario logueado podría llamarla de nuevo
-- sobre un pedido existente e inflar el comprometido hasta dejar el viaje
-- aparentando agotado.
revoke all on function public.preventa_comprometer(uuid) from public, anon, authenticated;
grant execute on function public.preventa_comprometer(uuid) to service_role;

-- Devolver lo comprometido. Se llama al cancelar un pedido y ANTES de reescribir
-- las líneas de un borrador que se está editando — si no, editar un borrador dos
-- veces deja el viaje bloqueado el doble de lo que el cliente pidió.
--
-- greatest(…, 0) por la misma razón que en container_cancelar_reserva: un doble
-- llamado nunca puede dejar el comprometido en negativo.
create or replace function public.preventa_liberar(p_pedido_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.container_items ci
     set comprometido = greatest(ci.comprometido - agg.cantidad, 0)
    from (
      select pi.container_item_id as item_id, sum(pi.cantidad)::integer as cantidad
        from public.pedido_items pi
       where pi.pedido_id = p_pedido_id
         and pi.container_item_id is not null
       group by pi.container_item_id
    ) agg
   where ci.id = agg.item_id;
end;
$$;

-- Solo el server, por la misma razón y una peor: sin chequeo de dueño, un
-- usuario logueado podría liberar con el id del pedido de otro y devolverle al
-- barco mercadería que ese pedido tenía tomada.
revoke all on function public.preventa_liberar(uuid) from public, anon, authenticated;
grant execute on function public.preventa_liberar(uuid) to service_role;
