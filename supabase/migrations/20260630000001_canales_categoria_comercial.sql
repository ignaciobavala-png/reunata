-- Renombra canales.tipo -> canales.categoria_comercial (evita confusión con productos.tipo,
-- que es un campo del ERP sin relación) y ata lista_precios a la categoría comercial
-- para que no puedan quedar desincronizados (ej. tipo='minorista' con lista_precios='precio_lista3').

ALTER TABLE public.canales
  RENAME COLUMN tipo TO categoria_comercial;

ALTER TABLE public.canales
  DROP CONSTRAINT canales_tipo_check;

ALTER TABLE public.canales
  ADD CONSTRAINT canales_categoria_comercial_check
  CHECK (categoria_comercial IN ('minorista', 'mayorista', 'especial'));

ALTER TABLE public.canales
  ADD CONSTRAINT canales_categoria_lista_precios_check
  CHECK (
    (categoria_comercial = 'minorista' AND lista_precios = 'precio_lista5')
    OR (categoria_comercial IN ('mayorista', 'especial') AND lista_precios = 'precio_lista3')
  );
