-- ============================================================
-- Reunata — Postulaciones (Trabaja con Nosotros)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Tabla postulaciones
-- ────────────────────────────────────────────────────────────
create table public.postulaciones (
  id               uuid primary key default gen_random_uuid(),
  tipo             text not null check (tipo in ('fulltime', 'comisionista')),
  nombre           text not null,
  apellido         text not null,
  email            text not null,
  dni              text not null,
  direccion        text not null,
  nacionalidad     text not null,
  cv_url           text,                          -- solo fulltime
  movilidad_propia boolean,                       -- solo comisionista
  zonas            text,                          -- solo comisionista
  otras_marcas     text,                          -- solo comisionista
  estado           text default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  created_at       timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- 2. RLS
-- ────────────────────────────────────────────────────────────
alter table public.postulaciones enable row level security;

-- Público: insertar postulación (formulario abierto)
create policy "public_insert_postulaciones" on public.postulaciones
  for insert to anon, authenticated
  with check (true);

-- Internos (master, empleado, comisionista): ver todas
create policy "interno_select_postulaciones" on public.postulaciones
  for select to authenticated
  using (get_rol() in ('master', 'empleado', 'comisionista'));

-- Internos: actualizar estado
create policy "interno_update_postulaciones" on public.postulaciones
  for update to authenticated
  using (get_rol() in ('master', 'empleado', 'comisionista'));

-- ────────────────────────────────────────────────────────────
-- 3. Storage bucket cv
-- ────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cv',
  'cv',
  true,
  5242880,  -- 5MB máximo
  array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
);

-- Lectura pública (admin ve los CVs desde el dashboard)
create policy "public_read_cv"
  on storage.objects for select
  to public
  using (bucket_id = 'cv');

-- Público puede subir (formulario abierto)
create policy "public_insert_cv"
  on storage.objects for insert
  to public
  with check (bucket_id = 'cv');

-- Internos pueden eliminar
create policy "interno_delete_cv"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'cv' and
    (select rol from public.profiles where id = auth.uid()) in ('master', 'empleado', 'comisionista')
  );
