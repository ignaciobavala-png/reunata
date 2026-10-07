-- El cliente no quiere que los productos nuevos (o reactivados) se asignen solos a
-- todos los canales activos (tester 07/10): cada producto se asigna a mano desde el
-- panel. El sync de GESU hace upsert con activo = true, así que hasta ahora cada
-- corrida reactivaba productos y el trigger les devolvía todos los canales.
-- Se elimina el trigger y su función. La migración que los creó
-- (20260513000001_trigger_auto_asignar_canales.sql) queda intacta.
DROP TRIGGER IF EXISTS trigger_auto_asignar_canales ON public.productos;
DROP FUNCTION IF EXISTS public.auto_asignar_producto_canales();
