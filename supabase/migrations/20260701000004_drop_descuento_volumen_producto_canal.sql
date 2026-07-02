-- El descuento por volumen dejó de ser por producto (Asignaciones) y pasó a ser
-- por canal sobre el total de la compra (canales_config.desc_volumen_*).
-- Se eliminan las columnas de producto_canales introducidas en 20260701000002.
ALTER TABLE public.producto_canales
  DROP CONSTRAINT IF EXISTS producto_canales_descuento_volumen_ambos_o_ninguno,
  DROP CONSTRAINT IF EXISTS producto_canales_descuento_volumen_cantidad_positiva,
  DROP CONSTRAINT IF EXISTS producto_canales_descuento_volumen_pct_rango;

ALTER TABLE public.producto_canales
  DROP COLUMN IF EXISTS descuento_volumen_cantidad_minima,
  DROP COLUMN IF EXISTS descuento_volumen_pct;
