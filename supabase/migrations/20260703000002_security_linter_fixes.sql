-- Fixes de seguridad reportados por el linter de Supabase (warnings preexistentes).
-- Todos son seguros: ninguno cambia el comportamiento de la app.
-- Aplicar en producción (SQL Editor o supabase db push).

-- ── 1) 🔴 cuentas_sin_iva — cierre de agujero de escritura pública ───────────
-- La policy "service all" era FOR ALL USING(true) WITH CHECK(true) SIN cláusula TO,
-- por lo que aplicaba a anon/authenticated: cualquiera podía modificar o borrar los
-- CBU/alias vía la API y desviar los pagos por transferencia a otra cuenta.
-- La app escribe esta tabla únicamente con service role (bypassa RLS), así que esta
-- policy no la usa nadie. Se elimina. La policy "public read" (SELECT) se conserva:
-- los CBU se muestran igual en el checkout.
DROP POLICY IF EXISTS "service all" ON public.cuentas_sin_iva;

-- ── 2) 🟠 Bucket cv — cortar enumeración de CV (datos personales) ────────────
-- El bucket cv es público y su policy de SELECT permitía LISTAR todos los archivos
-- (CV de postulantes). El admin abre cada CV por su URL pública directa, que en un
-- bucket público NO depende de esta policy, así que quitarla no rompe el acceso;
-- solo impide que un anónimo enumere todos los CV. (public_insert_cv e
-- interno_delete_cv se conservan.)
DROP POLICY IF EXISTS "public_read_cv" ON storage.objects;

-- ── 3) 🟠 Revocar ejecución por API de funciones internas ────────────────────
-- marcar_clientes_para_recontacto(): la dispara el cron diario (rol postgres), no
-- debe llamarse desde la API pública.
REVOKE EXECUTE ON FUNCTION public.marcar_clientes_para_recontacto() FROM anon, authenticated;
-- handle_new_user(): trigger de alta de usuario, no se llama por API.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- ── 4) 🟡 Fijar search_path en funciones SECURITY DEFINER (hardening) ─────────
-- Evita el hijacking de search_path. Se usa 'public' porque los cuerpos referencian
-- tablas de public sin calificar (misma convención que handle_new_user).
ALTER FUNCTION public.marcar_clientes_para_recontacto() SET search_path = public;
ALTER FUNCTION public.auto_asignar_producto_canales()  SET search_path = public;
