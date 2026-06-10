-- Dimensiones y peso para cotización de envíos con EnvioPack
-- alto/ancho/largo en cm (enteros), peso en kg (2 decimales)
-- enviar_solo: true si volumen > 27.000 cm³ (se despacha en su propia caja)

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS alto       integer,
  ADD COLUMN IF NOT EXISTS ancho      integer,
  ADD COLUMN IF NOT EXISTS largo      integer,
  ADD COLUMN IF NOT EXISTS peso       numeric(6,2),
  ADD COLUMN IF NOT EXISTS enviar_solo boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN productos.alto        IS 'Altura del producto en cm (para EnvioPack)';
COMMENT ON COLUMN productos.ancho       IS 'Ancho del producto en cm (para EnvioPack)';
COMMENT ON COLUMN productos.largo       IS 'Largo del producto en cm (para EnvioPack)';
COMMENT ON COLUMN productos.peso        IS 'Peso del producto en kg, hasta 2 decimales (para EnvioPack)';
COMMENT ON COLUMN productos.enviar_solo IS 'true si el producto debe enviarse solo en su propia caja (volumen > 27.000 cm³)';
