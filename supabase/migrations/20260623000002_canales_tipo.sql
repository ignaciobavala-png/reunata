ALTER TABLE canales
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'mayorista'
  CHECK (tipo IN ('minorista', 'mayorista', 'especial'));

UPDATE canales SET tipo = 'minorista' WHERE slug = 'consumidor_final';
UPDATE canales SET tipo = 'especial'  WHERE slug = 'fabricantes';
