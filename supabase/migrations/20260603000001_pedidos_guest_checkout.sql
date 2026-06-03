-- Habilitar compras de invitados (sin cuenta)
-- cliente_id pasa a ser nullable; los datos del comprador se guardan en guest_*

ALTER TABLE pedidos ALTER COLUMN cliente_id DROP NOT NULL;

ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS guest_nombre   text;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS guest_email    text;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS guest_telefono text;
