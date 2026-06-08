-- Columna para expiración de pedidos pendientes de pago.
-- El checkout la setea a NOW() + 24h al crear el pedido.
-- Un cron en /api/pedidos/limpiar cancela los vencidos.
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS expira_en timestamptz;
