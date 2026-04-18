-- ============================================================
-- Reunata — Storage bucket multimedia
-- ============================================================

-- Crear bucket público para fotos de productos y carrusel
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'multimedia',
  'multimedia',
  true,
  10485760,  -- 10MB máximo por archivo
  array['image/jpeg','image/png','image/webp','image/avif']
);

-- ────────────────────────────────────────────────────────────
-- Políticas de storage
-- ────────────────────────────────────────────────────────────

-- Lectura pública (catálogo visible sin login)
create policy "public_read_multimedia"
  on storage.objects for select
  to public
  using (bucket_id = 'multimedia');

-- Solo master puede subir, actualizar y eliminar
create policy "master_insert_multimedia"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'multimedia' and
    (select rol from public.profiles where id = auth.uid()) = 'master'
  );

create policy "master_update_multimedia"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'multimedia' and
    (select rol from public.profiles where id = auth.uid()) = 'master'
  );

create policy "master_delete_multimedia"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'multimedia' and
    (select rol from public.profiles where id = auth.uid()) = 'master'
  );
