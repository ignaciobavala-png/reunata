-- ============================================================
-- Reunata — Hero assets (carousel de la home)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Tabla hero_assets
-- ────────────────────────────────────────────────────────────
create table public.hero_assets (
  id          serial primary key,
  tipo        text not null check (tipo in ('imagen', 'video')),
  url         text not null,
  orden       integer default 0,
  activo      boolean default true,
  created_at  timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- 2. RLS
-- ────────────────────────────────────────────────────────────
alter table public.hero_assets enable row level security;

-- Lectura publica (homepage necesita verlos sin login)
create policy "public_read_hero" on public.hero_assets
  for select to anon, authenticated
  using (activo = true);

-- Internos: acceso total
create policy "interno_all_hero" on public.hero_assets
  for all to authenticated
  using (get_rol() in ('master', 'empleado', 'comisionista'));
