-- Doble descripción del producto + atributos para filtros.
-- La `descripcion` existente pasa a ser la de marketing/emocional. Se agrega la
-- ficha técnica (texto crudo) y sus atributos parseados (Clave: Valor por línea)
-- que alimentan los filtros clasificatorios de la tienda. La página es la única
-- fuente de verdad: el sync de Gesu ya no pisa la descripción. Todo nullable.
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS descripcion_tecnica text,
  ADD COLUMN IF NOT EXISTS atributos           jsonb;
