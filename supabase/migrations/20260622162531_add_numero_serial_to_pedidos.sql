-- Reconstruida el 2026-07-06: esta migración se había aplicado directo en la
-- base (Studio/SQL manual) sin dejar archivo versionado. Contenido reconstruido
-- por introspección del esquema real (information_schema.columns/sequences),
-- no reaplicar fuera de un entorno nuevo — en producción ya existe.
--
-- Nota: no hay UNIQUE constraint sobre `numero` en la base real — la
-- unicidad depende únicamente de que nada distinto al default de la
-- secuencia escriba en esta columna. Queda pendiente evaluar si conviene
-- agregar un UNIQUE explícito.

CREATE SEQUENCE IF NOT EXISTS public.pedidos_numero_seq;

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS numero integer NOT NULL DEFAULT nextval('public.pedidos_numero_seq');

ALTER SEQUENCE public.pedidos_numero_seq OWNED BY public.pedidos.numero;
