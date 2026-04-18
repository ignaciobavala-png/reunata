-- ============================================================
-- Reunata — Row Level Security (RLS)
-- ============================================================

-- Helper: obtener el rol del usuario actual
create or replace function public.get_rol()
returns text language sql security definer stable as $$
  select rol from public.profiles where id = auth.uid();
$$;

-- Helper: verificar si el cliente está aprobado
create or replace function public.cliente_aprobado()
returns boolean language sql security definer stable as $$
  select aprobado from public.profiles where id = auth.uid();
$$;

-- ────────────────────────────────────────────────────────────
-- PROFILES
-- ────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- Master: ve y edita todos los profiles
create policy "master_all_profiles" on public.profiles
  for all to authenticated
  using (get_rol() = 'master');

-- Empleado: ve solo su propio profile
create policy "empleado_own_profile" on public.profiles
  for select to authenticated
  using (get_rol() = 'empleado' and id = auth.uid());

-- Cliente: ve y edita solo su propio profile
create policy "cliente_own_profile" on public.profiles
  for all to authenticated
  using (get_rol() = 'cliente' and id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- PRODUCTOS
-- ────────────────────────────────────────────────────────────
alter table public.productos enable row level security;

-- Master: acceso total incluyendo precio_compra
create policy "master_all_productos" on public.productos
  for all to authenticated
  using (get_rol() = 'master');

-- Empleado: ve todos los productos activos (sin precio_compra — se filtra en la query)
create policy "empleado_read_productos" on public.productos
  for select to authenticated
  using (get_rol() = 'empleado' and activo = true);

-- Cliente aprobado: solo productos activos
create policy "cliente_read_productos" on public.productos
  for select to authenticated
  using (get_rol() = 'cliente' and activo = true and cliente_aprobado());

-- ────────────────────────────────────────────────────────────
-- PRODUCTO_FOTOS
-- ────────────────────────────────────────────────────────────
alter table public.producto_fotos enable row level security;

-- Master: acceso total
create policy "master_all_fotos" on public.producto_fotos
  for all to authenticated
  using (get_rol() = 'master');

-- Empleado y cliente: solo lectura
create policy "empleado_cliente_read_fotos" on public.producto_fotos
  for select to authenticated
  using (get_rol() in ('empleado', 'cliente'));

-- ────────────────────────────────────────────────────────────
-- PEDIDOS
-- ────────────────────────────────────────────────────────────
alter table public.pedidos enable row level security;

-- Master: acceso total
create policy "master_all_pedidos" on public.pedidos
  for all to authenticated
  using (get_rol() = 'master');

-- Empleado: ve todos los pedidos no borrador (para gestionar)
create policy "empleado_read_pedidos" on public.pedidos
  for select to authenticated
  using (get_rol() = 'empleado' and estado != 'borrador');

-- Empleado: puede actualizar pedidos asignados o sin asignar
create policy "empleado_update_pedidos" on public.pedidos
  for update to authenticated
  using (
    get_rol() = 'empleado' and
    (empleado_id = auth.uid() or empleado_id is null)
  );

-- Cliente: ve y gestiona solo sus propios pedidos
create policy "cliente_own_pedidos" on public.pedidos
  for all to authenticated
  using (get_rol() = 'cliente' and cliente_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- PEDIDO_ITEMS
-- ────────────────────────────────────────────────────────────
alter table public.pedido_items enable row level security;

-- Master: acceso total
create policy "master_all_pedido_items" on public.pedido_items
  for all to authenticated
  using (get_rol() = 'master');

-- Empleado: lee items de pedidos que puede ver
create policy "empleado_read_pedido_items" on public.pedido_items
  for select to authenticated
  using (
    get_rol() = 'empleado' and
    exists (
      select 1 from public.pedidos p
      where p.id = pedido_items.pedido_id and p.estado != 'borrador'
    )
  );

-- Cliente: solo sus propios pedidos
create policy "cliente_own_pedido_items" on public.pedido_items
  for all to authenticated
  using (
    get_rol() = 'cliente' and
    exists (
      select 1 from public.pedidos p
      where p.id = pedido_items.pedido_id and p.cliente_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- COMPROBANTES
-- ────────────────────────────────────────────────────────────
alter table public.comprobantes enable row level security;

-- Master y empleado: acceso total
create policy "master_empleado_all_comprobantes" on public.comprobantes
  for all to authenticated
  using (get_rol() in ('master', 'empleado'));

-- Cliente: solo sus propios comprobantes
create policy "cliente_own_comprobantes" on public.comprobantes
  for all to authenticated
  using (
    get_rol() = 'cliente' and
    exists (
      select 1 from public.pedidos p
      where p.id = comprobantes.pedido_id and p.cliente_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- CARRUSEL
-- ────────────────────────────────────────────────────────────
alter table public.carrusel enable row level security;

-- Público: lectura de imágenes activas (para el homepage)
create policy "public_read_carrusel" on public.carrusel
  for select to anon, authenticated
  using (activo = true);

-- Master: acceso total
create policy "master_all_carrusel" on public.carrusel
  for all to authenticated
  using (get_rol() = 'master');

-- ────────────────────────────────────────────────────────────
-- CONTENIDO
-- ────────────────────────────────────────────────────────────
alter table public.contenido enable row level security;

-- Público: lectura total (textos de la página son públicos)
create policy "public_read_contenido" on public.contenido
  for select to anon, authenticated
  using (true);

-- Master: puede editar
create policy "master_write_contenido" on public.contenido
  for all to authenticated
  using (get_rol() = 'master');

-- ────────────────────────────────────────────────────────────
-- CONFIGURACION
-- ────────────────────────────────────────────────────────────
alter table public.configuracion enable row level security;

-- Solo master puede leer y escribir configuración
create policy "master_all_configuracion" on public.configuracion
  for all to authenticated
  using (get_rol() = 'master');

-- ────────────────────────────────────────────────────────────
-- SYNC_LOG
-- ────────────────────────────────────────────────────────────
alter table public.sync_log enable row level security;

-- Solo master puede ver el historial de sync
create policy "master_read_sync_log" on public.sync_log
  for select to authenticated
  using (get_rol() = 'master');

-- Service role puede insertar (lo hace el cron job server-side)
create policy "service_insert_sync_log" on public.sync_log
  for insert to service_role
  with check (true);
