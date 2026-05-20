-- ============================================================
-- Reunata — Habilitar videos en bucket multimedia
-- ============================================================
-- El bucket fue creado solo con MIME de imágenes y límite 10MB.
-- Los videos (mp4/webm) eran rechazados silenciosamente por Supabase Storage.

update storage.buckets
set
  file_size_limit = 104857600,  -- 100MB (suficiente para videos hero)
  allowed_mime_types = array[
    'image/jpeg', 'image/png', 'image/webp', 'image/avif',
    'video/mp4', 'video/webm'
  ]
where id = 'multimedia';
