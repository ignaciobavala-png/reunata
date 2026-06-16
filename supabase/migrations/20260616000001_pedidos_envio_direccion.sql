-- Columnas de dirección de envío faltantes en pedidos
-- envio_codigo_postal y envio_provincia son escritas por checkout.ts
-- pero no estaban declaradas en la migración anterior (20260610000002)
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS envio_codigo_postal text,
  ADD COLUMN IF NOT EXISTS envio_provincia     text;

COMMENT ON COLUMN pedidos.envio_codigo_postal IS 'CP destino del envío seleccionado por el comprador';
COMMENT ON COLUMN pedidos.envio_provincia     IS 'ID de provincia para EnvioPack (ej: "C", "B", "X")';
