-- ============================================================
-- Reunata — Indice para el rate limit por email en corporativos
-- ============================================================
-- El rate limit dejo de ser global y ahora filtra por email
-- (antes 5 solicitudes/hora bloqueaban a cualquier otra empresa).

create index if not exists corporativos_email_created_at_idx
  on public.corporativos (email, created_at desc);
