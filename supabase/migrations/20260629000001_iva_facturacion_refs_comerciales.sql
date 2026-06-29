-- Soporte para selección de IVA en pedidos mayoristas y referencias comerciales en solicitudes de crédito

-- 1. Columna factura_iva en pedidos (null = no aplica/mayorista sin selección, true = con IVA, false = sin IVA)
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS factura_iva boolean;

-- 2. Ampliar CHECK de medio_pago para incluir echeq_al_dia
ALTER TABLE public.pedidos DROP CONSTRAINT IF EXISTS pedidos_medio_pago_check;
ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_medio_pago_check CHECK (
  medio_pago = ANY (ARRAY[
    'efectivo',
    'transferencia_blanco',
    'transferencia_cueva',
    'echeq_propio',
    'echeq_tercero',
    'echeq_al_dia',
    'cheque_propio',
    'cheque_tercero',
    'cuenta_corriente',
    'mercadopago'
  ]::text[])
);

-- 3. Referencias comerciales en solicitudes de crédito
ALTER TABLE public.solicitudes_credito ADD COLUMN IF NOT EXISTS referencias_comerciales jsonb;

-- 4. Claves de CBU sin IVA en configuración general
INSERT INTO public.configuracion (clave, valor)
VALUES
  ('cbu_sin_iva',   ''),
  ('alias_sin_iva', '')
ON CONFLICT (clave) DO NOTHING;
