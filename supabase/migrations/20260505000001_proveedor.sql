-- ============================================================
-- Reunata — Nuevo tipo "proveedor" en postulaciones
-- ============================================================

-- 1. Extender CHECK de tipo
alter table public.postulaciones
  drop constraint if exists postulaciones_tipo_check;

alter table public.postulaciones
  add constraint postulaciones_tipo_check
    check (tipo in ('fulltime', 'comisionista', 'proveedor'));

-- 2. Columnas específicas de proveedor (todas opcionales)
alter table public.postulaciones
  add column if not exists cargo              text,
  add column if not exists empresa            text,
  add column if not exists cuit               text,
  add column if not exists pagina_web         text,
  add column if not exists productos_servicios   text,
  add column if not exists otras_empresas_provee text;
