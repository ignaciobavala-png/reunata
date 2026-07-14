-- alto/ancho/largo pasan de integer a numeric(6,2): la ficha del admin ahora
-- acepta cm con decimales (coma es-AR) y EnvioPack los admite.
ALTER TABLE productos
  ALTER COLUMN alto  TYPE numeric(6,2),
  ALTER COLUMN ancho TYPE numeric(6,2),
  ALTER COLUMN largo TYPE numeric(6,2);

COMMENT ON COLUMN productos.alto  IS 'Alto del producto en cm, hasta 2 decimales (para EnvioPack)';
COMMENT ON COLUMN productos.ancho IS 'Ancho del producto en cm, hasta 2 decimales (para EnvioPack)';
COMMENT ON COLUMN productos.largo IS 'Largo del producto en cm, hasta 2 decimales (para EnvioPack)';
