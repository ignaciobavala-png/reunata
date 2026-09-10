-- Puerta única para reservar mercadería de un container.
--
-- El cliente NO tiene policy de insert sobre container_reservas: la única forma
-- de crear una reserva es esta función, que descuenta el comprometido en la misma
-- transacción. Si el alta y el descuento fueran dos pasos separados, dos clientes
-- que compran a la vez se llevan la misma unidad y el barco llega corto.
--
-- Los precios llegan calculados desde el server (lista del canal + descuento de
-- etapa, ver src/lib/containers.ts) porque la regla de precios ya vive en
-- TypeScript y duplicarla en plpgsql garantiza que las dos se separen. Lo que NO
-- se acepta del cliente es qué etapa ni qué descuento: eso se lee del container.

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
  v_moneda     text;
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

  select p.moneda into v_moneda
    from public.container_items ci
    join public.productos p on p.id = ci.producto_id
   where ci.container_id = p_container_id
   limit 1;

  update public.container_reservas
     set total = v_total, moneda = coalesce(v_moneda, 'u$s')
   where id = v_reserva_id;

  return v_reserva_id;
end;
$$;

revoke all on function public.container_reservar(uuid, jsonb, text) from public, anon;
grant execute on function public.container_reservar(uuid, jsonb, text) to authenticated;

-- Cancelar devuelve el comprometido. Sin esto, cancelar una reserva deja la
-- mercadería bloqueada para siempre y el container parece vendido sin estarlo.
create or replace function public.container_cancelar_reserva(p_reserva_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := (select auth.uid());
  v_estado text;
  v_dueno  uuid;
begin
  select estado, cliente_id into v_estado, v_dueno
    from public.container_reservas where id = p_reserva_id for update;

  if v_estado is null then
    raise exception 'La reserva no existe';
  end if;

  if not public.es_interno() and v_dueno is distinct from v_uid then
    raise exception 'No autorizado';
  end if;

  if v_estado = 'cancelada' then
    return;
  end if;

  update public.container_items ci
     set comprometido = greatest(ci.comprometido - ri.cantidad, 0)
    from public.container_reserva_items ri
   where ri.reserva_id = p_reserva_id
     and ci.id = ri.container_item_id;

  update public.container_reservas set estado = 'cancelada' where id = p_reserva_id;
end;
$$;

revoke all on function public.container_cancelar_reserva(uuid) from public, anon;
grant execute on function public.container_cancelar_reserva(uuid) to authenticated;
