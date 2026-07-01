-- Ajuste de disposición final de canales:
-- "Distribuidor / Pool de compra" se separa en dos canales (Distribuidor y Pool de Compras,
-- este último lo crea el admin desde el panel). Se elimina el canal "prueba" (sin uso).

UPDATE public.canales
SET nombre = 'Distribuidor'
WHERE slug = 'distribuidor';

DELETE FROM public.canales
WHERE slug = 'prueba';
