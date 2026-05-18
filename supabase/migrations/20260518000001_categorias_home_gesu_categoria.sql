-- Reunata — categorias_home: gesu_categoria para sincronización automática desde Gesu API
ALTER TABLE public.categorias_home
  ADD COLUMN IF NOT EXISTS gesu_categoria text;

CREATE UNIQUE INDEX IF NOT EXISTS categorias_home_gesu_categoria_key
  ON public.categorias_home (gesu_categoria)
  WHERE gesu_categoria IS NOT NULL;
