-- Precio dinámico en la etapa "En viaje" (oceano).
--
-- Devolución del tester (16/09/2026): el descuento de la segunda etapa no es un
-- número quieto. Arranca en el % cargado y sube de precio todos los días hasta
-- llegar al precio web —"pueden ser escalones pequeños y muchos", "1 escalón por
-- día"— así que la referencia de la rampa son el precio 2 (lista − descuento_oceano)
-- y el precio 3, que NO es un número que se cargue: es el precio de la web, o sea
-- descuento 0. Por eso siguen siendo dos porcentajes y no tres precios.
--
-- La rampa se ancla al día en que una persona apretó "En viaje" y a los días que
-- faltaban para el arribo EN ESE MOMENTO, congelados. No se mide contra
-- fecha_arribo_est en vivo a propósito: si el barco se demora y alguien corre la
-- fecha, una rampa en vivo se estiraría y el precio BAJARÍA — el que compró ayer
-- habría pagado más que el que compra hoy. Con la duración congelada el descuento
-- llega a 0, se queda en precio web y espera a que la persona pase el viaje a
-- nacionalizado. El precio nunca vuelve atrás.
alter table public.containers
  add column if not exists oceano_desde date,
  add column if not exists oceano_dias  integer check (oceano_dias is null or oceano_dias > 0);

comment on column public.containers.oceano_desde is
  'Día en que el viaje pasó a la etapa "En viaje". Lo escribe cambiarEtapa(), no el calendario.';
comment on column public.containers.oceano_dias is
  'Días de rampa congelados al entrar en "En viaje" (fecha_arribo_est − ese día). El descuento baja de descuento_oceano a 0 a lo largo de estos días.';

-- Viajes que ya estaban navegando cuando se agregó la rampa: arrancan hoy con el
-- descuento entero y bajan hasta el arribo estimado. Sin esto quedarían con la
-- rampa vacía, que se comporta como antes (% fijo) y nunca sube de precio.
update public.containers
   set oceano_desde = (now() at time zone 'America/Argentina/Buenos_Aires')::date,
       oceano_dias  = greatest(
         (fecha_arribo_est - (now() at time zone 'America/Argentina/Buenos_Aires')::date), 1)
 where etapa = 'oceano'
   and oceano_desde is null
   and fecha_arribo_est is not null;

-- ---------------------------------------------------------------------------
-- El descuento vigente, en la base
-- ---------------------------------------------------------------------------
-- Espejo exacto de descuentoVigente() en src/lib/containers.ts. Existe porque
-- container_reservar() congela el descuento de la reserva y no puede pedírselo al
-- cliente. Las dos implementaciones tienen que moverse juntas.
--
-- El día se mide en hora argentina y no en UTC: con current_date a secas el
-- escalón diario cambiaría a las 21:00 del día anterior, y el TypeScript (que
-- también mide en hora argentina) mostraría un precio distinto al que guarda la
-- base durante esas tres horas.
create or replace function public.container_descuento_vigente(p_container_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when c.etapa = 'china' then coalesce(c.descuento_china, 0)
    when c.etapa <> 'oceano' then 0
    when c.oceano_desde is null or coalesce(c.oceano_dias, 0) <= 0
      then coalesce(c.descuento_oceano, 0)
    else greatest(round(
      coalesce(c.descuento_oceano, 0) * (
        1 - least(
          greatest(((now() at time zone 'America/Argentina/Buenos_Aires')::date - c.oceano_desde), 0)::numeric
            / c.oceano_dias,
          1)
      ), 2), 0)
  end
  from public.containers c
  where c.id = p_container_id
$$;

revoke all on function public.container_descuento_vigente(uuid) from public, anon;
grant execute on function public.container_descuento_vigente(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- La puerta única de reservas usa la rampa
-- ---------------------------------------------------------------------------
-- Solo cambia de dónde sale v_descuento: el `case etapa` que tenía adentro era el
-- % fijo de la etapa y con la rampa dejó de ser cierto en "En viaje".
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

  select etapa, public.container_descuento_vigente(id), cotizacion_congelada
    into v_etapa, v_descuento, v_cotizacion
    from public.containers
   where id = p_container_id
   for share;

  if v_etapa is null then
    raise exception 'El viaje no existe';
  end if;

  -- Nacionalizado es de solo lectura: la mercadería ya pasa a stock normal y se
  -- vende al precio de la web. Cerrado no vende nada, aunque le queden ítems.
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
