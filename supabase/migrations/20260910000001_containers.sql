-- Containers — preventa de mercadería importada por etapas del viaje.
--
-- Cada viaje es una subcuenta de GESU ("CONTENEDOR 3", "CONTENEDOR 4"…), con su
-- propio token de API. Esa cuenta es un stock independizado: tiene los MISMOS
-- códigos de artículo que la cuenta principal, y por eso la mercadería del barco
-- NO puede vivir en `productos` (la unicidad es por codigo_interno a secas y el
-- segundo sync pisaría la fila del primero, sin error ni log).
--
-- Vive en `container_items`, referenciando el producto de la tienda por id. Así
-- la card del catálogo es una sola: el producto es el mismo, lo que cambia es
-- cuándo llega y a qué precio. De ahí el botón "¿Cuándo viene?" en vez de una
-- sección aparte con el catálogo duplicado.
--
-- Las etapas, los descuentos y los permisos son NUESTROS: la API de GESU es un
-- catálogo plano que no sabe de viajes. La etapa la avanza una persona desde el
-- panel, nunca el calendario ni la API — si el barco se demora, el sistema no
-- puede decir "llegó" solo.

-- ---------------------------------------------------------------------------
-- Permiso de acceso a preventa
-- ---------------------------------------------------------------------------
-- `canales.acceso_precompra` ya existía desde el diseño original de canales
-- (20260418000003) y nunca se leyó desde el código. Es exactamente este permiso,
-- a nivel canal, así que se reusa como default en vez de agregar una columna
-- paralela que signifique lo mismo.
--
-- El override por usuario es nullable a propósito: null = heredar del canal,
-- true/false = decisión explícita de Gastón sobre esa cuenta en particular. Con
-- un boolean not null habría que tocar cada perfil al habilitar un canal entero.
alter table public.profiles
  add column if not exists containers_habilitado boolean;

comment on column public.profiles.containers_habilitado is
  'Acceso a preventa de containers. null = hereda de canales.acceso_precompra del canal del usuario; true/false = override manual desde el panel.';

-- `acceso_precompra` venía en true para distribuidor, fabricantes y merchandising
-- desde el seed de canales de abril. Como la columna nunca se leyó desde el código,
-- esos valores son restos de un diseño que no se activó — pero al empezar a leerla
-- acá, esos tres canales quedarían con preventa habilitada sin que nadie la haya
-- otorgado. Se apagan para que el default sea "nadie": el permiso se da a mano.
-- La palanca por canal queda intacta para cuando se quiera usar de verdad.
update public.canales set acceso_precompra = false where acceso_precompra;

create or replace function public.puede_containers()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    p.containers_habilitado,
    (select c.acceso_precompra from public.canales c where c.slug = p.rol),
    false
  )
  from public.profiles p
  where p.id = (select auth.uid())
$$;

revoke all on function public.puede_containers() from public, anon;
grant execute on function public.puede_containers() to authenticated;

-- ---------------------------------------------------------------------------
-- El viaje
-- ---------------------------------------------------------------------------
create table if not exists public.containers (
  id                    uuid primary key default gen_random_uuid(),
  nombre                text not null,
  -- Id de la subcuenta de GESU. La cuenta ES el viaje: por eso es único y por eso
  -- no hace falta inferir a qué container pertenece cada producto.
  gesu_cuenta_id        text unique,
  -- NOMBRE de la variable de entorno que guarda el token (ej. GESU_TOKEN_CONTENEDOR_3).
  -- El token nunca se guarda en la base ni en el repo: vive en .env.local y en Vercel.
  gesu_token_env        text,
  etapa                 text not null default 'borrador'
                          check (etapa in ('borrador','china','oceano','puerto','cerrado','cancelado')),
  -- Descuento por etapa. Escalonado (fijo por etapa) y no continuo: el cliente ve
  -- el mismo precio cada vez que entra, y una demora del barco no cambia el precio
  -- de algo que ya compró. Puerto no descuenta — es precio de lista.
  descuento_china       numeric not null default 0 check (descuento_china  >= 0 and descuento_china  < 100),
  descuento_oceano      numeric not null default 0 check (descuento_oceano >= 0 and descuento_oceano < 100),
  -- Fechas ESTIMADAS: se muestran, no disparan nada.
  fecha_cierre_china    date,
  fecha_embarque        date,
  fecha_arribo_est      date,
  fecha_liberacion      date,
  cotizacion_congelada  numeric,
  notas                 text,
  orden                 integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.containers is
  'Un viaje de importación. Corresponde 1:1 con una subcuenta de GESU.';

-- ---------------------------------------------------------------------------
-- Qué viene en el viaje, por color
-- ---------------------------------------------------------------------------
-- Una fila por (viaje, código, color). Distintas cuentas de GESU tienen
-- habilitados distintos colores del mismo artículo, así que el color no puede ser
-- un jsonb del producto: es la unidad que se reserva y se descuenta.
create table if not exists public.container_items (
  id                bigserial primary key,
  container_id      uuid not null references public.containers(id) on delete cascade,
  -- El producto de la tienda con el que se muestra. Nullable porque un artículo
  -- puede venir en el barco antes de existir en la cuenta principal.
  producto_id       integer references public.productos(id) on delete set null,
  codigo_interno    text not null,
  titulo            text not null,
  variante          text,
  cantidad          integer not null default 0 check (cantidad >= 0),
  -- Lo ya tomado por reservas. Se descuenta acá y no del stock de GESU porque el
  -- sync corre cada horas y Elena mueve la mercadería a mano: entre que el cliente
  -- reserva y GESU se entera, dos clientes pueden llevarse la misma unidad.
  comprometido      integer not null default 0 check (comprometido >= 0),
  -- Override del precio base. null = precio de lista del canal del cliente.
  precio_base       numeric,
  created_at        timestamptz not null default now(),
  constraint container_items_no_sobreventa check (comprometido <= cantidad)
);

create unique index if not exists container_items_unico
  on public.container_items (container_id, codigo_interno, coalesce(variante, ''));

create index if not exists container_items_producto
  on public.container_items (producto_id) where producto_id is not null;

create index if not exists container_items_codigo
  on public.container_items (codigo_interno);

-- ---------------------------------------------------------------------------
-- La reserva del cliente
-- ---------------------------------------------------------------------------
create table if not exists public.container_reservas (
  id              uuid primary key default gen_random_uuid(),
  container_id    uuid not null references public.containers(id),
  cliente_id      uuid not null references public.profiles(id),
  -- Congelados al momento de reservar: definen el precio pagado aunque el viaje
  -- avance de etapa después.
  etapa_compra    text not null,
  descuento_pct   numeric not null,
  cotizacion      numeric,
  moneda          text,
  total           numeric,
  estado          text not null default 'solicitada'
                    check (estado in ('solicitada','confirmada','cancelada')),
  -- Facturado y entregado son independientes y por eso NO son estados: acá se
  -- factura mercadería por venir, así que una reserva puede estar facturada y sin
  -- entregar durante 60 días. Colapsarlos en un solo enum obliga a elegir cuál de
  -- los dos se pierde.
  facturada_en    timestamptz,
  entregada_en    timestamptz,
  -- Acuse de que Elena ya movió la mercadería de la cuenta del container a la
  -- principal. Sin esto, nuestro comprometido y el stock de GESU derivan y nadie
  -- se entera.
  movida_a_gesu_en timestamptz,
  notas           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists container_reservas_cliente on public.container_reservas (cliente_id);
create index if not exists container_reservas_container on public.container_reservas (container_id);

create table if not exists public.container_reserva_items (
  id                bigserial primary key,
  reserva_id        uuid not null references public.container_reservas(id) on delete cascade,
  container_item_id bigint not null references public.container_items(id),
  cantidad          integer not null check (cantidad > 0),
  -- Congelados con el descuento ya aplicado. El neto se despeja del bruto, nunca
  -- se suma IVA (ver src/lib/iva.ts).
  precio_unit       numeric not null,
  neto_unit         numeric not null
);

create index if not exists container_reserva_items_reserva on public.container_reserva_items (reserva_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.containers            enable row level security;
alter table public.container_items       enable row level security;
alter table public.container_reservas    enable row level security;
alter table public.container_reserva_items enable row level security;

-- Viajes: los internos manejan todo; el cliente habilitado ve solo los viajes
-- vivos. Un container cerrado no vende nada, sin excepción, aunque le queden
-- ítems — si no, se vende dos veces la misma unidad.
drop policy if exists containers_interno_all on public.containers;
create policy containers_interno_all on public.containers
  for all to authenticated
  using (public.es_interno()) with check (public.es_interno());

drop policy if exists containers_cliente_select on public.containers;
create policy containers_cliente_select on public.containers
  for select to authenticated
  using (public.puede_containers() and etapa in ('china','oceano','puerto'));

drop policy if exists container_items_interno_all on public.container_items;
create policy container_items_interno_all on public.container_items
  for all to authenticated
  using (public.es_interno()) with check (public.es_interno());

drop policy if exists container_items_cliente_select on public.container_items;
create policy container_items_cliente_select on public.container_items
  for select to authenticated
  using (
    public.puede_containers()
    and exists (
      select 1 from public.containers c
      where c.id = container_id and c.etapa in ('china','oceano','puerto')
    )
  );

drop policy if exists container_reservas_interno_all on public.container_reservas;
create policy container_reservas_interno_all on public.container_reservas
  for all to authenticated
  using (public.es_interno()) with check (public.es_interno());

drop policy if exists container_reservas_cliente_select on public.container_reservas;
create policy container_reservas_cliente_select on public.container_reservas
  for select to authenticated
  using (cliente_id = (select auth.uid()));

-- El alta de reservas NO se hace por RLS: pasa por una función de puerta única
-- que descuenta el comprometido en la misma transacción (ver más abajo). Sin
-- policy de insert para el cliente, no hay forma de crear una reserva salteando
-- el descuento.

drop policy if exists container_reserva_items_interno_all on public.container_reserva_items;
create policy container_reserva_items_interno_all on public.container_reserva_items
  for all to authenticated
  using (public.es_interno()) with check (public.es_interno());

drop policy if exists container_reserva_items_cliente_select on public.container_reserva_items;
create policy container_reserva_items_cliente_select on public.container_reserva_items
  for select to authenticated
  using (exists (
    select 1 from public.container_reservas r
    where r.id = reserva_id and r.cliente_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create or replace function public.containers_touch_updated_at()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.containers_touch_updated_at() from public, anon, authenticated;

drop trigger if exists trg_containers_touch on public.containers;
create trigger trg_containers_touch before update on public.containers
  for each row execute function public.containers_touch_updated_at();

drop trigger if exists trg_container_reservas_touch on public.container_reservas;
create trigger trg_container_reservas_touch before update on public.container_reservas
  for each row execute function public.containers_touch_updated_at();
