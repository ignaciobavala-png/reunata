-- Permite que un comprador SIN cuenta (anónimo) suba su comprobante de
-- transferencia directo a Storage, restringido a la carpeta pre/.
-- El invitado nunca puede leer ni listar: SELECT/DELETE siguen solo para
-- master/empleado (políticas de 20260629000004_storage_comprobantes.sql).
-- El pedido y el vínculo con el comprobante los crea el servidor con service role.

create policy "anon_insert_comprobantes_pre"
  on storage.objects for insert
  to anon
  with check (
    bucket_id = 'comprobantes'
    and (storage.foldername(name))[1] = 'pre'
  );
