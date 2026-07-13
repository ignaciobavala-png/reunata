-- Método de envío por pedido, para registrar y contar cuántos se despachan por
-- cada canal. 'enviopack' se marca solo al generar el envío; 'interno' lo marca
-- Elena a mano (moto, remís, retiro en local, otro correo). NULL = sin marcar.
-- Nullable, no afecta pedidos existentes.
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS metodo_envio text
    CHECK (metodo_envio IN ('enviopack', 'interno'));
