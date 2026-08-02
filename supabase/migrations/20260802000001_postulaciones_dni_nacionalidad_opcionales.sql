-- ============================================================
-- Reunata — DNI y nacionalidad opcionales en postulaciones
-- ============================================================
-- El formulario dejo de pedir estos dos campos (commit e8f08ab), pero las
-- columnas seguian siendo NOT NULL: todo insert fallaba desde el 2026-05-06.

alter table public.postulaciones
  alter column dni          drop not null,
  alter column nacionalidad drop not null;

-- Indice para el rate limit por email (lookup de la ultima hora)
create index if not exists postulaciones_email_created_at_idx
  on public.postulaciones (email, created_at desc);
