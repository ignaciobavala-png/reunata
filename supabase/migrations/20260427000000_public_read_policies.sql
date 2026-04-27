-- ============================================================
-- Reunata — Políticas de lectura pública para la tienda
-- ============================================================
-- Hasta ahora, productos y producto_fotos solo eran legibles
-- por usuarios autenticados (empleado, cliente, master).
-- Los visitantes anónimos no podían ver la tienda ni las fotos.

-- Permitir que visitantes anónimos vean productos activos
create policy "public_read_productos" on public.productos
  for select to anon
  using (activo = true);

-- Permitir que visitantes anónimos vean fotos de productos
create policy "public_read_fotos" on public.producto_fotos
  for select to anon
  using (true);
