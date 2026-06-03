-- Valor inicial del tipo de cambio USD → ARS.
-- El administrador lo actualiza desde el panel de configuración.
INSERT INTO public.configuracion (clave, valor)
VALUES ('tipo_cambio_usd', '1')
ON CONFLICT (clave) DO NOTHING;
