-- Cierra el hueco de "cliente_own_*" con FOR ALL: un cliente autenticado podía
-- insertar/editar/borrar directamente pedidos, pedido_items y comprobantes vía
-- supabase-js desde el navegador (cantidad, precio_unit, estado, etc.), sin pasar
-- por ninguna validación de servidor. Ahora esas escrituras solo pueden hacerse
-- desde server actions con service role (que ya validan rol y transición de
-- estado en código: ver actualizarEstadoPedido, confirmarPago, subirComprobante
-- en src/app/actions/pedidos.ts). El cliente conserva SELECT para ver sus propios
-- pedidos/ítems/comprobantes en "Mis pedidos".

-- pedidos — cliente_own: FOR ALL → SELECT
DROP POLICY IF EXISTS cliente_own_pedidos ON public.pedidos;
CREATE POLICY cliente_select_own_pedidos ON public.pedidos
  FOR SELECT TO authenticated
  USING (
    (select es_cliente()) AND cliente_id = (select auth.uid())
  );

-- pedidos — comisionista_own: FOR ALL → SELECT
DROP POLICY IF EXISTS comisionista_own_pedidos ON public.pedidos;
CREATE POLICY comisionista_select_own_pedidos ON public.pedidos
  FOR SELECT TO authenticated
  USING (
    (select get_rol()) = 'comisionista' AND comisionista_id = (select auth.uid())
  );

-- pedido_items — cliente_own: FOR ALL → SELECT
DROP POLICY IF EXISTS cliente_own_pedido_items ON public.pedido_items;
CREATE POLICY cliente_select_own_pedido_items ON public.pedido_items
  FOR SELECT TO authenticated
  USING (
    (select es_cliente())
    AND (EXISTS (
      SELECT 1 FROM pedidos p
      WHERE p.id = pedido_items.pedido_id AND p.cliente_id = (select auth.uid())
    ))
  );

-- comprobantes — cliente_own: FOR ALL → SELECT
DROP POLICY IF EXISTS cliente_own_comprobantes ON public.comprobantes;
CREATE POLICY cliente_select_own_comprobantes ON public.comprobantes
  FOR SELECT TO authenticated
  USING (
    (select es_cliente())
    AND (EXISTS (
      SELECT 1 FROM pedidos p
      WHERE p.id = comprobantes.pedido_id AND p.cliente_id = (select auth.uid())
    ))
  );
