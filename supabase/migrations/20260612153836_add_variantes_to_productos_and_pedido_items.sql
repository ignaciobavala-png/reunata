-- Reconstruida el 2026-07-06: esta migración se había aplicado directo en la
-- base (Studio/SQL manual) sin dejar archivo versionado. Contenido reconstruido
-- por introspección del esquema real (information_schema.columns), no reaplicar
-- fuera de un entorno nuevo — en producción ya existe.

ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS variantes jsonb;

ALTER TABLE public.pedido_items
  ADD COLUMN IF NOT EXISTS variante text;
