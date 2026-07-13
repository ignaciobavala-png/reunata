-- Integración Enviopack punta a punta (crear envío + imprimir etiqueta).
-- Fase 1: campos para persistir el servicio/localidad del envío y el estado del
-- envío en Enviopack. Todo nullable — no afecta pedidos existentes.
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS envio_servicio      text,   -- servicio elegido (N/P/X)
  ADD COLUMN IF NOT EXISTS envio_localidad     text,   -- localidad destino (Enviopack)
  ADD COLUMN IF NOT EXISTS enviopack_envio_id  text,   -- id del envío en Enviopack
  ADD COLUMN IF NOT EXISTS enviopack_estado    text,   -- estado del envío (en_proceso/procesado/...)
  ADD COLUMN IF NOT EXISTS etiqueta_url        text,   -- URL de la etiqueta una vez disponible
  ADD COLUMN IF NOT EXISTS tracking            text;   -- código de seguimiento (interno)
