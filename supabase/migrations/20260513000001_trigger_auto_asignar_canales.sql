-- Trigger: auto-asignar productos nuevos (o reactivados) a todos los canales activos.
-- Resuelve el problema de productos creados después de la migration inicial
-- que quedaban sin asignación y eran invisibles para todos los clientes.

CREATE OR REPLACE FUNCTION public.auto_asignar_producto_canales()
RETURNS TRIGGER AS $$
BEGIN
  -- Actúa en INSERT con activo=true, o en UPDATE cuando pasa de inactivo a activo
  IF (TG_OP = 'INSERT' AND NEW.activo = true) OR
     (TG_OP = 'UPDATE' AND NEW.activo = true AND OLD.activo = false) THEN
    INSERT INTO public.producto_canales (producto_id, canal_id)
    SELECT NEW.id, c.id
    FROM public.canales c
    WHERE c.activo = true
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_auto_asignar_canales
AFTER INSERT OR UPDATE OF activo ON public.productos
FOR EACH ROW
EXECUTE FUNCTION public.auto_asignar_producto_canales();

-- Backfill: asignar los productos activos que quedaron sin ningún canal
INSERT INTO public.producto_canales (producto_id, canal_id)
SELECT p.id, c.id
FROM public.productos p
CROSS JOIN public.canales c
WHERE p.activo = true
  AND c.activo = true
  AND NOT EXISTS (
    SELECT 1 FROM public.producto_canales pc
    WHERE pc.producto_id = p.id AND pc.canal_id = c.id
  )
ON CONFLICT DO NOTHING;
