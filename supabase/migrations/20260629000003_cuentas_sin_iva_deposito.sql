-- Agregar soporte para tipo 'deposito' en cuentas_sin_iva
-- (columnas cuit y banco + ampliar el CHECK constraint)

ALTER TABLE public.cuentas_sin_iva
  ADD COLUMN IF NOT EXISTS cuit  text,
  ADD COLUMN IF NOT EXISTS banco text;

-- Reemplazar el CHECK constraint para incluir 'deposito'
ALTER TABLE public.cuentas_sin_iva
  DROP CONSTRAINT IF EXISTS cuentas_sin_iva_tipo_check;

ALTER TABLE public.cuentas_sin_iva
  ADD CONSTRAINT cuentas_sin_iva_tipo_check
    CHECK (tipo = ANY (ARRAY['CBU', 'CVU', 'deposito']));
