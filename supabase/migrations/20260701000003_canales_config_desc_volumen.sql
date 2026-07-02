-- Descuento por volumen a nivel canal: superando un monto $X en el total de la
-- compra (post descuentos por volumen de producto), se aplica un % de descuento
-- sobre ese total. Ambas columnas nulas = sin descuento configurado (default).
ALTER TABLE public.canales_config
  ADD COLUMN IF NOT EXISTS desc_volumen_monto_min numeric(12,2),
  ADD COLUMN IF NOT EXISTS desc_volumen_pct       numeric(5,2);

ALTER TABLE public.canales_config
  ADD CONSTRAINT canales_config_desc_volumen_ambos_o_ninguno
    CHECK (
      (desc_volumen_monto_min IS NULL AND desc_volumen_pct IS NULL)
      OR (desc_volumen_monto_min IS NOT NULL AND desc_volumen_pct IS NOT NULL)
    ),
  ADD CONSTRAINT canales_config_desc_volumen_monto_positivo
    CHECK (desc_volumen_monto_min IS NULL OR desc_volumen_monto_min > 0),
  ADD CONSTRAINT canales_config_desc_volumen_pct_rango
    CHECK (desc_volumen_pct IS NULL OR (desc_volumen_pct > 0 AND desc_volumen_pct <= 100));
