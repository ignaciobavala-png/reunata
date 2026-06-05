-- Eliminar canal "publico" — nunca se usa en tienda ni catálogo (reservado chatbot, sin UI)
-- Limpia productos asignados al canal y cualquier perfil que apunte a él antes de borrar

-- 1. Desvincular productos asignados al canal público
DELETE FROM public.producto_canales
WHERE canal_id = (SELECT id FROM public.canales WHERE slug = 'publico');

-- 2. Desasociar perfiles que tuvieran este canal asignado (no debería haber ninguno)
UPDATE public.profiles
SET canal_id = NULL
WHERE canal_id = (SELECT id FROM public.canales WHERE slug = 'publico');

-- 3. Eliminar el canal
DELETE FROM public.canales WHERE slug = 'publico';
