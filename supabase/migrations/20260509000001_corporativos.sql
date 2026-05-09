-- ============================================================
-- Reunata — Corporativos (formulario de regalos corporativos)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Tabla corporativos
-- ────────────────────────────────────────────────────────────
create table public.corporativos (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  empresa          text not null,
  email            text not null,
  telefono         text,
  cuit             text,
  ubicacion        text,
  ocasion          text,
  cantidades       integer,
  productos        text[] default '{}',
  personalizar     text check (personalizar in ('Sí', 'No')),
  fecha_limite     date,
  estado           text default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- 2. RLS
-- ────────────────────────────────────────────────────────────
alter table public.corporativos enable row level security;

-- Público: insertar solicitud (formulario abierto)
create policy "public_insert_corporativos" on public.corporativos
  for insert to anon, authenticated
  with check (true);

-- Internos (master, empleado): ver todas
create policy "interno_select_corporativos" on public.corporativos
  for select to authenticated
  using (get_rol() in ('master', 'empleado'));

-- Internos: actualizar estado
create policy "interno_update_corporativos" on public.corporativos
  for update to authenticated
  using (get_rol() in ('master', 'empleado'));

-- Internos: eliminar
create policy "interno_delete_corporativos" on public.corporativos
  for delete to authenticated
  using (get_rol() in ('master', 'empleado'));

-- ────────────────────────────────────────────────────────────
-- 3. Storage bucket corporativos (fotos de trabajos)
-- ────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'corporativos',
  'corporativos',
  true,
  10485760,  -- 10MB
  array['image/jpeg', 'image/png', 'image/webp']
);

-- Lectura pública (las fotos se muestran en la página pública)
create policy "public_read_corporativos"
  on storage.objects for select
  to public
  using (bucket_id = 'corporativos');

-- Internos pueden subir (admin sube fotos de trabajos realizados)
create policy "interno_insert_corporativos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'corporativos' and
    get_rol() in ('master', 'empleado')
  );

-- Internos pueden eliminar
create policy "interno_delete_corporativos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'corporativos' and
    get_rol() in ('master', 'empleado')
  );
