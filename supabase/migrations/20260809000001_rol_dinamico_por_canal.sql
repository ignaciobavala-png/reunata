-- profiles.rol tenía la lista de slugs congelada en un CHECK
-- ('consumidor_final','distribuidor','local','mercha'), pero los canales de venta
-- se crean desde el panel (Emprendedores, Pool de Compras, Fabricantes…).
-- Consecuencia: registrarse con un canal nuevo rompía por violación del CHECK y,
-- si el rol se seteaba por otra vía, es_cliente() devolvía false y RLS cerraba todo.
--
-- Ahora el rol se valida por trigger contra canales.slug, así cada canal nuevo
-- queda habilitado automáticamente.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_rol_check;

CREATE OR REPLACE FUNCTION public.validar_rol_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.rol IS NULL THEN
    RAISE EXCEPTION 'profiles.rol no puede ser null';
  END IF;

  IF NEW.rol NOT IN ('master', 'empleado', 'comisionista')
     AND NOT EXISTS (SELECT 1 FROM public.canales c WHERE c.slug = NEW.rol) THEN
    RAISE EXCEPTION 'rol invalido: % (no es un rol interno ni el slug de un canal de venta)', NEW.rol;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_validar_rol ON public.profiles;

CREATE TRIGGER profiles_validar_rol
  BEFORE INSERT OR UPDATE OF rol ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validar_rol_profile();

-- es_cliente() enumeraba los mismos 4 slugs: un cliente de un canal nuevo no era
-- "cliente" para RLS. Se define por descarte contra los roles internos.
CREATE OR REPLACE FUNCTION public.es_cliente()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $$
  select p.rol not in ('master', 'empleado', 'comisionista')
  from public.profiles p where p.id = (select auth.uid());
$$;
