-- Descuento por volumen: a partir de N unidades de un producto (en un canal dado),
-- se aplica un % de descuento adicional sobre esa línea del pedido.
-- Ambas columnas nulas = sin descuento configurado (default).
ALTER TABLE public.producto_canales
  ADD COLUMN IF NOT EXISTS descuento_volumen_cantidad_minima integer,
  ADD COLUMN IF NOT EXISTS descuento_volumen_pct numeric(5,2);

ALTER TABLE public.producto_canales
  ADD CONSTRAINT producto_canales_descuento_volumen_ambos_o_ninguno
    CHECK (
      (descuento_volumen_cantidad_minima IS NULL AND descuento_volumen_pct IS NULL)
      OR (descuento_volumen_cantidad_minima IS NOT NULL AND descuento_volumen_pct IS NOT NULL)
    ),
  ADD CONSTRAINT producto_canales_descuento_volumen_cantidad_positiva
    CHECK (descuento_volumen_cantidad_minima IS NULL OR descuento_volumen_cantidad_minima > 0),
  ADD CONSTRAINT producto_canales_descuento_volumen_pct_rango
    CHECK (descuento_volumen_pct IS NULL OR (descuento_volumen_pct > 0 AND descuento_volumen_pct <= 100));
