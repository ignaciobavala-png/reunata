-- Fix 1: canales_config — restringir lectura a usuarios autenticados
-- (el carrito lee vía service client, no necesita acceso anónimo)
DROP POLICY IF EXISTS canales_config_lectura_publica ON public.canales_config;
CREATE POLICY canales_config_lectura_autenticada ON public.canales_config
  FOR SELECT TO authenticated
  USING (true);

-- Fix 2: solicitudes_credito — guard de rol mayorista en INSERT
-- Separamos la política ALL en operaciones individuales para poder
-- restringir INSERT sin afectar SELECT/UPDATE/DELETE del propio cliente.
DROP POLICY IF EXISTS cliente_own_solicitudes ON public.solicitudes_credito;

CREATE POLICY solicitudes_select ON public.solicitudes_credito
  FOR SELECT USING (auth.uid() = cliente_id);

CREATE POLICY solicitudes_insert ON public.solicitudes_credito
  FOR INSERT WITH CHECK (
    auth.uid() = cliente_id
    AND (SELECT rol FROM public.profiles WHERE id = auth.uid())
        IN ('distribuidor', 'local', 'mercha')
  );

CREATE POLICY solicitudes_update ON public.solicitudes_credito
  FOR UPDATE USING (auth.uid() = cliente_id);

CREATE POLICY solicitudes_delete ON public.solicitudes_credito
  FOR DELETE USING (auth.uid() = cliente_id);

-- Fix 3: direcciones_entrega — guard de rol mayorista en INSERT
DROP POLICY IF EXISTS cliente_own_direcciones ON public.direcciones_entrega;

CREATE POLICY direcciones_select ON public.direcciones_entrega
  FOR SELECT USING (auth.uid() = cliente_id);

CREATE POLICY direcciones_insert ON public.direcciones_entrega
  FOR INSERT WITH CHECK (
    auth.uid() = cliente_id
    AND (SELECT rol FROM public.profiles WHERE id = auth.uid())
        IN ('distribuidor', 'local', 'mercha')
  );

CREATE POLICY direcciones_update ON public.direcciones_entrega
  FOR UPDATE USING (auth.uid() = cliente_id);

CREATE POLICY direcciones_delete ON public.direcciones_entrega
  FOR DELETE USING (auth.uid() = cliente_id);

-- Fix 4: hero_assets — quitar comisionista de escritura
DROP POLICY IF EXISTS interno_all_hero ON public.hero_assets;
CREATE POLICY interno_all_hero ON public.hero_assets
  FOR ALL TO authenticated
  USING (get_rol() = ANY (ARRAY['master'::text, 'empleado'::text]));
