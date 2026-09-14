-- El total de la reserva está en pesos, no en dólares.
--
-- `container_reservar` guardaba `moneda = coalesce(productos.moneda, 'u$s')`: la
-- moneda CRUDA con la que el artículo viene de GESU. Pero el total que recibe no
-- es esa moneda — los precios llegan de `actions/containers.ts`, que ya los pasó
-- por `aplicarTipoCambio` (src/lib/utils.ts): un producto en u$s sale de ahí
-- convertido a pesos y con `moneda: null`, que es como el resto de la tienda
-- marca "esto ya está en pesos".
--
-- El efecto: `formatPrecio(total, 'u$s')` imprime "USD 1.200.000,00" sobre un
-- monto en pesos. Y como el coalesce tenía 'u$s' de default, pasaba siempre, no
-- en un caso borde. Salía en los tres lugares que leen la reserva:
-- /cuenta/reservas, el panel de admin y el mail que recibe el interno.
--
-- La columna se conserva: cuando se decida congelar el precio en dólares y
-- cobrar a la cotización del día de la factura, este es el lugar donde la reserva
-- va a declarar en qué moneda está su total. Hoy ese circuito no existe y el
-- total siempre es pesos, así que se escribe null.

comment on column public.container_reservas.moneda is
  'Moneda del total de la reserva. null = pesos (es el caso de hoy: los precios '
  'llegan ya convertidos por aplicarTipoCambio). Reservada para cuando el precio '
  'se congele en dólares y se cobre a la cotización de la factura.';

-- Reservas ya creadas: el total siempre estuvo en pesos, solo estaba mal rotulado.
update public.container_reservas
   set moneda = null
 where moneda in ('u$s', 'USD');

-- Misma función que 20260910000002, sin el lookup de la moneda del producto.
create or replace function public.container_reservar(
  p_container_id uuid,
  p_items jsonb,
  p_notas text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid        uuid := (select auth.uid());
  v_etapa      text;
  v_descuento  numeric;
  v_cotizacion numeric;
  v_reserva_id uuid;
  v_total      numeric := 0;
  it           record;
begin
  if v_uid is null then
    raise exception 'Sesión requerida';
  end if;

  if not public.puede_containers() then
    raise exception 'Tu cuenta no tiene acceso a preventa de importados';
  end if;

  select etapa,
         case etapa
           when 'china'  then descuento_china
           when 'oceano' then descuento_oceano
           else 0
         end,
         cotizacion_congelada
    into v_etapa, v_descuento, v_cotizacion
    from public.containers
   where id = p_container_id
   for share;

  if v_etapa is null then
    raise exception 'El viaje no existe';
  end if;

  -- Puerto es de solo lectura: son los 10 días de aduana. Cerrado no vende nada,
  -- aunque le queden ítems.
  if v_etapa not in ('china', 'oceano') then
    raise exception 'El viaje no está recibiendo reservas (etapa: %)', v_etapa;
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La reserva no tiene ítems';
  end if;

  insert into public.container_reservas
    (container_id, cliente_id, etapa_compra, descuento_pct, cotizacion, notas)
  values
    (p_container_id, v_uid, v_etapa, v_descuento, v_cotizacion, p_notas)
  returning id into v_reserva_id;

  -- Ordenado por id: dos reservas simultáneas que tocan los mismos ítems toman
  -- los locks en el mismo orden y no se trencan.
  for it in
    select (e->>'container_item_id')::bigint as item_id,
           (e->>'cantidad')::integer         as cantidad,
           (e->>'precio_unit')::numeric      as precio_unit,
           (e->>'neto_unit')::numeric        as neto_unit
      from jsonb_array_elements(p_items) e
     order by (e->>'container_item_id')::bigint
  loop
    if it.cantidad is null or it.cantidad <= 0 then
      raise exception 'Cantidad inválida en el ítem %', it.item_id;
    end if;

    -- El lock va acá: entre el chequeo de disponible y el update no puede entrar
    -- nadie.
    perform 1
       from public.container_items
      where id = it.item_id and container_id = p_container_id
      for update;

    if not found then
      raise exception 'El ítem % no pertenece a este viaje', it.item_id;
    end if;

    update public.container_items
       set comprometido = comprometido + it.cantidad
     where id = it.item_id
       and cantidad - comprometido >= it.cantidad;

    if not found then
      raise exception 'No queda suficiente de uno de los colores elegidos. Actualizá la página y probá de nuevo.';
    end if;

    insert into public.container_reserva_items
      (reserva_id, container_item_id, cantidad, precio_unit, neto_unit)
    values
      (v_reserva_id, it.item_id, it.cantidad, it.precio_unit, it.neto_unit);

    v_total := v_total + (it.precio_unit * it.cantidad);
  end loop;

  -- `moneda` queda en null a propósito: el total está en pesos. Ver el comentario
  -- de la columna, arriba.
  update public.container_reservas
     set total = v_total
   where id = v_reserva_id;

  return v_reserva_id;
end;
$$;

revoke all on function public.container_reservar(uuid, jsonb, text) from public, anon;
grant execute on function public.container_reservar(uuid, jsonb, text) to authenticated;
