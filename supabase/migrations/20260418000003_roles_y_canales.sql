-- ============================================================
-- Reunata — Migración: roles expandidos + canales de venta
-- ============================================================
-- VULNERABILIDADES QUE CORRIGE:
-- 1. profiles.rol CHECK solo admitía 'master','empleado','cliente' → roto para nuevos tipos
-- 2. RLS get_rol()='cliente' dejaba sin acceso a todos los clientes con el nuevo esquema
-- 3. handle_new_user() insertaba rol='cliente' que ya no existe en el CHECK
-- 4. pedidos no tenía comisionista_id ni campos de descuento sugerido
-- 5. empleado_cliente_read_fotos usaba 'cliente' inexistente
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. CANALES DE VENTA
-- Define cada tipo de cliente con sus políticas y accesos.
-- ────────────────────────────────────────────────────────────
create table public.canales (
  id                  serial primary key,
  slug                text unique not null, -- 'consumidor_final','distribuidor','local','mercha'
  nombre              text not null,
  descripcion         text,
  -- Qué lista de precios usa por defecto (lista1..lista5)
  lista_precios       text not null default 'precio_lista1',
  -- Acceso a formatos de producto
  ver_por_bulto       boolean default false,
  ver_por_unidad      boolean default true,
  acceso_precompra    boolean default false,
  -- Políticas editables por master
  politica_pago       text,
  politica_descuentos text,
  condiciones         text,
  activo              boolean default true
);

insert into public.canales (slug, nombre, descripcion, lista_precios, ver_por_bulto, ver_por_unidad, acceso_precompra) values
  ('consumidor_final', 'Consumidor Final', 'Clientes minoristas registrados para recibir promociones y novedades.',
   'precio_lista5', false, true,  false),
  ('distribuidor',     'Distribuidor / Pool de compra', 'Distribuidores con acceso a productos por bulto y pre-compra.',
   'precio_lista1', true,  false, true),
  ('local',            'Local', 'Locales comerciales con acceso a productos por unidad.',
   'precio_lista2', false, true,  false),
  ('mercha',           'Merchandising', 'Acceso a productos por bulto y por unidad, con pre-compra.',
   'precio_lista3', true,  true,  true);

-- ────────────────────────────────────────────────────────────
-- 2. PRODUCTO_CANALES
-- El master selecciona qué productos de Gesu son visibles en cada canal.
-- ────────────────────────────────────────────────────────────
create table public.producto_canales (
  producto_id integer references public.productos(id) on delete cascade,
  canal_id    integer references public.canales(id)   on delete cascade,
  primary key (producto_id, canal_id)
);

-- ────────────────────────────────────────────────────────────
-- 3. AMPLIAR profiles.rol
-- Eliminar CHECK viejo y agregar todos los nuevos valores.
-- 'cliente' queda eliminado — los nuevos valores son los tipos específicos.
-- ────────────────────────────────────────────────────────────
alter table public.profiles
  drop constraint profiles_rol_check;

alter table public.profiles
  add constraint profiles_rol_check check (rol in (
    -- Usuarios internos
    'master',
    'empleado',
    'comisionista',
    -- Usuarios clientes
    'consumidor_final',
    'distribuidor',
    'local',
    'mercha'
  ));

-- Migrar cualquier perfil existente con rol='cliente' a 'consumidor_final'
update public.profiles set rol = 'consumidor_final' where rol = 'cliente';

-- ────────────────────────────────────────────────────────────
-- 4. NUEVOS CAMPOS EN profiles
-- ────────────────────────────────────────────────────────────
-- canal_id: FK al canal que define precios y visibilidad (para clientes)
alter table public.profiles
  add column if not exists canal_id integer references public.canales(id);

-- bonificacion_extra: descuento adicional sobre la lista del canal (override por cliente)
-- Ya existe 'bonificacion', se renombra semánticamente en comentario.

-- lista_precios: eliminamos el uso directo — se deriva del canal.
-- Lo mantenemos como campo de override manual (null = usa la del canal).
-- No se elimina para no romper datos existentes.

-- ────────────────────────────────────────────────────────────
-- 5. NUEVOS CAMPOS EN pedidos
-- ────────────────────────────────────────────────────────────
alter table public.pedidos
  add column if not exists comisionista_id     uuid references public.profiles(id),
  add column if not exists descuento_sugerido  numeric,
  add column if not exists descuento_aprobado  boolean default false,
  add column if not exists descuento_nota      text;

-- ────────────────────────────────────────────────────────────
-- 6. ACTUALIZAR handle_new_user()
-- Default = 'consumidor_final' en lugar del inexistente 'cliente'
-- ────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, rol)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'rol', 'consumidor_final')
  );
  return new;
end;
$$;

-- ────────────────────────────────────────────────────────────
-- 7. NUEVAS FUNCIONES HELPER PARA RLS
-- ────────────────────────────────────────────────────────────

-- Reemplaza get_rol() — sin cambios, solo documentado
create or replace function public.get_rol()
returns text language sql security definer stable as $$
  select rol from public.profiles where id = auth.uid();
$$;

-- Verdadero si el usuario es personal interno
create or replace function public.es_interno()
returns boolean language sql security definer stable as $$
  select rol in ('master', 'empleado', 'comisionista')
  from public.profiles where id = auth.uid();
$$;

-- Verdadero si el usuario es cualquier tipo de cliente
create or replace function public.es_cliente()
returns boolean language sql security definer stable as $$
  select rol in ('consumidor_final', 'distribuidor', 'local', 'mercha')
  from public.profiles where id = auth.uid();
$$;

-- Verdadero si el cliente está aprobado (sin cambios)
create or replace function public.cliente_aprobado()
returns boolean language sql security definer stable as $$
  select aprobado from public.profiles where id = auth.uid();
$$;

-- ────────────────────────────────────────────────────────────
-- 8. REEMPLAZAR TODAS LAS POLÍTICAS RLS AFECTADAS
-- Las políticas antiguas usaban 'cliente' que ya no existe.
-- ────────────────────────────────────────────────────────────

-- PROFILES
drop policy if exists "empleado_own_profile"  on public.profiles;
drop policy if exists "cliente_own_profile"   on public.profiles;

create policy "empleado_comisionista_own_profile" on public.profiles
  for select to authenticated
  using (get_rol() in ('empleado', 'comisionista') and id = auth.uid());

create policy "cliente_own_profile" on public.profiles
  for all to authenticated
  using (es_cliente() and id = auth.uid());

-- PRODUCTOS
drop policy if exists "empleado_read_productos" on public.productos;
drop policy if exists "cliente_read_productos"  on public.productos;

create policy "empleado_comisionista_read_productos" on public.productos
  for select to authenticated
  using (get_rol() in ('empleado', 'comisionista') and activo = true);

-- Clientes aprobados: solo ven productos asignados a su canal
create policy "cliente_read_productos" on public.productos
  for select to authenticated
  using (
    es_cliente() and activo = true and cliente_aprobado() and
    exists (
      select 1 from public.producto_canales pc
      join public.profiles p on p.canal_id = pc.canal_id
      where pc.producto_id = productos.id and p.id = auth.uid()
    )
  );

-- PRODUCTO_FOTOS
drop policy if exists "empleado_cliente_read_fotos" on public.producto_fotos;

create policy "interno_cliente_read_fotos" on public.producto_fotos
  for select to authenticated
  using (es_interno() or (es_cliente() and cliente_aprobado()));

-- RLS para la tabla nueva
alter table public.producto_canales enable row level security;

create policy "master_all_producto_canales" on public.producto_canales
  for all to authenticated
  using (get_rol() = 'master');

create policy "interno_read_producto_canales" on public.producto_canales
  for select to authenticated
  using (get_rol() in ('empleado', 'comisionista'));

create policy "cliente_read_producto_canales" on public.producto_canales
  for select to authenticated
  using (
    es_cliente() and cliente_aprobado() and
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.canal_id = producto_canales.canal_id
    )
  );

-- CANALES
alter table public.canales enable row level security;

create policy "master_all_canales" on public.canales
  for all to authenticated
  using (get_rol() = 'master');

create policy "interno_read_canales" on public.canales
  for select to authenticated
  using (es_interno());

create policy "cliente_read_propio_canal" on public.canales
  for select to authenticated
  using (
    es_cliente() and
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.canal_id = canales.id
    )
  );

-- PEDIDOS: actualizar política de clientes y agregar comisionista
drop policy if exists "empleado_read_pedidos"   on public.pedidos;
drop policy if exists "empleado_update_pedidos" on public.pedidos;
drop policy if exists "cliente_own_pedidos"     on public.pedidos;

create policy "empleado_read_pedidos" on public.pedidos
  for select to authenticated
  using (get_rol() in ('empleado', 'comisionista') and estado != 'borrador');

create policy "empleado_update_pedidos" on public.pedidos
  for update to authenticated
  using (
    get_rol() in ('empleado') and
    (empleado_id = auth.uid() or empleado_id is null)
  );

-- Comisionista: crea y ve pedidos donde es el comisionista
create policy "comisionista_own_pedidos" on public.pedidos
  for all to authenticated
  using (get_rol() = 'comisionista' and comisionista_id = auth.uid());

create policy "cliente_own_pedidos" on public.pedidos
  for all to authenticated
  using (es_cliente() and cliente_id = auth.uid());

-- PEDIDO_ITEMS
drop policy if exists "empleado_read_pedido_items" on public.pedido_items;
drop policy if exists "cliente_own_pedido_items"   on public.pedido_items;

create policy "interno_read_pedido_items" on public.pedido_items
  for select to authenticated
  using (
    es_interno() and
    exists (
      select 1 from public.pedidos p
      where p.id = pedido_items.pedido_id and p.estado != 'borrador'
    )
  );

create policy "cliente_own_pedido_items" on public.pedido_items
  for all to authenticated
  using (
    es_cliente() and
    exists (
      select 1 from public.pedidos p
      where p.id = pedido_items.pedido_id and p.cliente_id = auth.uid()
    )
  );

-- COMPROBANTES
drop policy if exists "master_empleado_all_comprobantes" on public.comprobantes;
drop policy if exists "cliente_own_comprobantes"         on public.comprobantes;

create policy "interno_all_comprobantes" on public.comprobantes
  for all to authenticated
  using (es_interno());

create policy "cliente_own_comprobantes" on public.comprobantes
  for all to authenticated
  using (
    es_cliente() and
    exists (
      select 1 from public.pedidos p
      where p.id = comprobantes.pedido_id and p.cliente_id = auth.uid()
    )
  );
