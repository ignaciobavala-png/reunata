-- ============================================================
-- Reunata — Ofertas y Hot Sale
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Tabla ofertas
-- ────────────────────────────────────────────────────────────
create table public.ofertas (
  id                   serial primary key,
  canal                text not null check (canal in ('ofertas', 'hotsale')),
  producto_id          integer not null references public.productos(id) on delete cascade,
  precio_oferta        numeric(10,2) not null,
  descuento_porcentaje integer not null,
  orden                integer not null default 0,
  activo               boolean not null default true,
  created_at           timestamptz default now(),
  unique(canal, producto_id)
);

-- ────────────────────────────────────────────────────────────
-- 2. RLS
-- ────────────────────────────────────────────────────────────
alter table public.ofertas enable row level security;

-- Público: lectura (para el drawer de FloatingActions)
create policy "public_select_ofertas" on public.ofertas
  for select
  using (true);

-- Internos (master, empleado): CRUD completo
create policy "interno_insert_ofertas" on public.ofertas
  for insert to authenticated
  with check (get_rol() in ('master', 'empleado'));

create policy "interno_update_ofertas" on public.ofertas
  for update to authenticated
  using (get_rol() in ('master', 'empleado'));

create policy "interno_delete_ofertas" on public.ofertas
  for delete to authenticated
  using (get_rol() in ('master', 'empleado'));
