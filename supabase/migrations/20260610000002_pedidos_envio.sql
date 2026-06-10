-- Campos de envío en pedidos para integración EnvioPack
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS costo_envio       numeric(10,2),
  ADD COLUMN IF NOT EXISTS envio_descripcion text;

COMMENT ON COLUMN pedidos.costo_envio       IS 'Costo de envío en ARS seleccionado por el comprador';
COMMENT ON COLUMN pedidos.envio_descripcion IS 'Descripción de la opción de envío (ej: "Envío Estándar · 3 días")';
