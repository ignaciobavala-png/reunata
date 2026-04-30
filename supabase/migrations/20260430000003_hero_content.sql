-- ============================================================
-- Reunata — Columnas de contenido para hero_assets
-- ============================================================

alter table public.hero_assets
  add column if not exists etiqueta    text,
  add column if not exists titulo      text,
  add column if not exists subtitulo   text,
  add column if not exists boton_texto text,
  add column if not exists boton_url   text;
