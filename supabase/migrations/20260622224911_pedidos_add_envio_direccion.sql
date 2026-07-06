-- Reconstruida el 2026-07-06: esta migración se había aplicado directo en la
-- base (Studio/SQL manual) sin dejar archivo versionado. Contenido reconstruido
-- por introspección del esquema real (information_schema.columns), no reaplicar
-- fuera de un entorno nuevo — en producción ya existe.

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS envio_calle  text,
  ADD COLUMN IF NOT EXISTS envio_numero text,
  ADD COLUMN IF NOT EXISTS envio_piso   text;
