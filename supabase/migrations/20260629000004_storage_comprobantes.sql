-- Bucket privado para comprobantes de pago
-- Los clientes suben desde el carrito (pre/) o desde el detalle del pedido ({pedidoId}/)
-- Solo master/empleado pueden ver los archivos (a través del admin)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comprobantes',
  'comprobantes',
  false,
  20971520,  -- 20MB
  array['image/jpeg','image/png','image/webp','image/avif','application/pdf']
);

-- Cualquier usuario autenticado puede subir su propio comprobante
create policy "autenticado_insert_comprobantes"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'comprobantes');

-- Solo master y empleado pueden ver los archivos
create policy "master_empleado_select_comprobantes"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'comprobantes' and
    (select rol from public.profiles where id = auth.uid()) in ('master', 'empleado')
  );

-- Solo master puede eliminar
create policy "master_delete_comprobantes"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'comprobantes' and
    (select rol from public.profiles where id = auth.uid()) = 'master'
  );
