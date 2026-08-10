-- La policy de INSERT de direcciones_entrega enumeraba los slugs de canal a mano
-- ('distribuidor','local','mercha'), pero los canales se crean desde el panel.
-- Un cliente de un canal nuevo (pool_de_compras, emprendedores, fabricantes…)
-- pasaba el guard del server action pero era rechazado por RLS: el usuario veía
-- "Error al guardar la dirección" al agregar una dirección de entrega.
--
-- Mismo criterio que 20260809000001_rol_dinamico_por_canal: el rol se define por
-- descarte, no por lista fija. Mayorista = cliente que no es consumidor final.

CREATE OR REPLACE FUNCTION public.es_mayorista()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $$
  select p.rol not in ('master', 'empleado', 'comisionista', 'consumidor_final')
  from public.profiles p where p.id = (select auth.uid());
$$;

DROP POLICY IF EXISTS direcciones_insert ON public.direcciones_entrega;

CREATE POLICY direcciones_insert ON public.direcciones_entrega
  FOR INSERT WITH CHECK (
    auth.uid() = cliente_id
    AND public.es_mayorista()
  );

-- Mismo bug latente en las otras dos policies que enumeraban los slugs a mano:
-- un cliente de canal nuevo tampoco podía pedir crédito ni ver los catálogos.

DROP POLICY IF EXISTS solicitudes_insert ON public.solicitudes_credito;

CREATE POLICY solicitudes_insert ON public.solicitudes_credito
  FOR INSERT WITH CHECK (
    auth.uid() = cliente_id
    AND public.es_mayorista()
  );

DROP POLICY IF EXISTS catalogos_select ON public.catalogos;

CREATE POLICY catalogos_select ON public.catalogos
  FOR SELECT TO authenticated
  USING (public.get_rol() <> 'consumidor_final');
