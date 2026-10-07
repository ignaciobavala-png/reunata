-- Peso con 3 decimales (tester 07/10): con numeric(6,2) no se podían cargar
-- productos de menos de 10 g (0,005 kg = 5 g se redondeaba a 0,00/0,01).
-- La migración original vive en 20260610000001_productos_dimensiones_envio.sql.
ALTER TABLE productos
  ALTER COLUMN peso TYPE numeric(8,3);

COMMENT ON COLUMN productos.peso IS 'Peso del producto en kg, hasta 3 decimales (para EnvioPack)';
