-- Corrige y completa 20260703000002.

-- ── 1) REVOKE efectivo (el anterior no tuvo efecto) ─────────────────────────
-- El EXECUTE de estas funciones estaba otorgado a PUBLIC (default de Postgres),
-- así que revocarlo de anon/authenticated NO hacía nada: seguían pudiendo vía
-- PUBLIC. Hay que revocarlo de PUBLIC.

-- handle_new_user: es un trigger (AFTER INSERT en auth.users). El disparo del
-- trigger NO requiere EXECUTE, así que revocar de PUBLIC no afecta el alta de
-- usuarios; solo cierra la ejecución directa por API.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- marcar_clientes_para_recontacto: la llama el cron con service role. Se revoca
-- de PUBLIC (cierra anon/authenticated) y se RE-OTORGA a service_role para que el
-- cron siga funcionando (si solo revocáramos de PUBLIC, service_role también lo
-- perdería porque lo tenía vía PUBLIC).
REVOKE EXECUTE ON FUNCTION public.marcar_clientes_para_recontacto() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.marcar_clientes_para_recontacto() TO service_role;

-- ── 2) Buckets públicos: cortar el listado anónimo ──────────────────────────
-- multimedia y corporativos son públicos; el acceso por URL directa no depende
-- de la policy de SELECT y no hay ningún .list() en la app, así que quitarlas
-- solo impide enumerar los archivos (mismo criterio que cv).
DROP POLICY IF EXISTS "public_read_multimedia"   ON storage.objects;
DROP POLICY IF EXISTS "public_read_corporativos" ON storage.objects;
