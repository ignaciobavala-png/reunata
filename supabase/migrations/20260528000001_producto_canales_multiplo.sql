-- Múltiplo de cantidad mínima por producto por canal de venta.
-- DEFAULT 1 = sin restricción. Retrocompatible con todos los registros existentes.
ALTER TABLE public.producto_canales
  ADD COLUMN IF NOT EXISTS multiplo integer NOT NULL DEFAULT 1;
