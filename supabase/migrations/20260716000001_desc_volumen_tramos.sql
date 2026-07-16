-- Descuento por volumen escalonado: hasta 3 tramos por canal (pedido del tester 16/07).
-- El tramo 1 son las columnas existentes desc_volumen_monto_min/desc_volumen_pct.
-- Se aplica el tramo más alto cuyo monto mínimo sea superado por el total.
ALTER TABLE public.canales_config
  ADD COLUMN IF NOT EXISTS desc_volumen_monto_min_2 numeric(12,2),
  ADD COLUMN IF NOT EXISTS desc_volumen_pct_2       numeric(5,2),
  ADD COLUMN IF NOT EXISTS desc_volumen_monto_min_3 numeric(12,2),
  ADD COLUMN IF NOT EXISTS desc_volumen_pct_3       numeric(5,2);

ALTER TABLE public.canales_config
  -- Cada tramo: ambos campos o ninguno (mismo criterio que el tramo 1)
  ADD CONSTRAINT canales_config_desc_volumen2_ambos_o_ninguno
    CHECK (
      (desc_volumen_monto_min_2 IS NULL AND desc_volumen_pct_2 IS NULL)
      OR (desc_volumen_monto_min_2 IS NOT NULL AND desc_volumen_pct_2 IS NOT NULL)
    ),
  ADD CONSTRAINT canales_config_desc_volumen3_ambos_o_ninguno
    CHECK (
      (desc_volumen_monto_min_3 IS NULL AND desc_volumen_pct_3 IS NULL)
      OR (desc_volumen_monto_min_3 IS NOT NULL AND desc_volumen_pct_3 IS NOT NULL)
    ),
  -- Un tramo N requiere el N-1 cargado
  ADD CONSTRAINT canales_config_desc_volumen2_requiere_1
    CHECK (desc_volumen_monto_min_2 IS NULL OR desc_volumen_monto_min IS NOT NULL),
  ADD CONSTRAINT canales_config_desc_volumen3_requiere_2
    CHECK (desc_volumen_monto_min_3 IS NULL OR desc_volumen_monto_min_2 IS NOT NULL),
  -- Umbrales estrictamente crecientes
  ADD CONSTRAINT canales_config_desc_volumen_orden
    CHECK (
      (desc_volumen_monto_min_2 IS NULL OR desc_volumen_monto_min_2 > desc_volumen_monto_min)
      AND (desc_volumen_monto_min_3 IS NULL OR desc_volumen_monto_min_3 > desc_volumen_monto_min_2)
    ),
  ADD CONSTRAINT canales_config_desc_volumen2_pct_rango
    CHECK (desc_volumen_pct_2 IS NULL OR (desc_volumen_pct_2 > 0 AND desc_volumen_pct_2 <= 100)),
  ADD CONSTRAINT canales_config_desc_volumen3_pct_rango
    CHECK (desc_volumen_pct_3 IS NULL OR (desc_volumen_pct_3 > 0 AND desc_volumen_pct_3 <= 100));
