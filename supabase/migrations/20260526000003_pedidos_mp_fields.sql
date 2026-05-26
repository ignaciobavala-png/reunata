-- Campos para integración Mercado Pago
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS mp_preference_id text,
  ADD COLUMN IF NOT EXISTS mp_payment_id     text;
