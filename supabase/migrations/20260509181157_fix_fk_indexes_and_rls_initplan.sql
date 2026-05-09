-- ============================================================
-- Migration: Fix FK indexes + RLS InitPlan + Function hardening
-- ============================================================

-- ========== PART 1: FK INDEXES ==========
-- Without these, JOINs on foreign keys do sequential scans.
-- Critical as pedidos, pedido_items grow.

CREATE INDEX IF NOT EXISTS idx_comprobantes_pedido_id ON public.comprobantes(pedido_id);
CREATE INDEX IF NOT EXISTS idx_ofertas_producto_id ON public.ofertas(producto_id);
CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido_id ON public.pedido_items(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_items_producto_id ON public.pedido_items(producto_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id ON public.pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_comisionista_id ON public.pedidos(comisionista_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_empleado_id ON public.pedidos(empleado_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_pago_confirmado_por ON public.pedidos(pago_confirmado_por);
CREATE INDEX IF NOT EXISTS idx_producto_canales_canal_id ON public.producto_canales(canal_id);
CREATE INDEX IF NOT EXISTS idx_producto_fotos_producto_id ON public.producto_fotos(producto_id);
CREATE INDEX IF NOT EXISTS idx_profiles_canal_id ON public.profiles(canal_id);

-- Additional query performance indexes
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON public.productos(categoria);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON public.productos(activo);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON public.pedidos(estado);

-- ========== PART 2: FUNCTION HARDENING ==========
-- Fix 3 issues per function:
--   1. SET search_path = '' → prevent search_path injection
--   2. Wrap auth.uid() in subquery → RLS InitPlan optimization
--      (evalúa auth.uid() una sola vez por query, no por fila)

CREATE OR REPLACE FUNCTION public.get_rol()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $$
  select rol from public.profiles where id = (select auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.es_cliente()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $$
  select rol in ('consumidor_final', 'distribuidor', 'local', 'mercha')
  from public.profiles where id = (select auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.cliente_aprobado()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $$
  select aprobado from public.profiles where id = (select auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.es_interno()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $$
  select rol in ('master', 'empleado', 'comisionista')
  from public.profiles where id = (select auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Revoke EXECUTE on internal SECURITY DEFINER functions from anon
-- (still usable via RLS policies, but not directly via REST API)
REVOKE EXECUTE ON FUNCTION public.get_rol() FROM anon;
REVOKE EXECUTE ON FUNCTION public.es_cliente() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cliente_aprobado() FROM anon;
REVOKE EXECUTE ON FUNCTION public.es_interno() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;

-- ========== PART 3: RLS INITPLAN — auth.uid() DIRECT ==========
-- Policies with auth.uid() outside a function must wrap it in (select ...)
-- so Postgres creates an initplan (evaluates once per query, not per row).

-- canales
DROP POLICY IF EXISTS cliente_read_propio_canal ON public.canales;
CREATE POLICY cliente_read_propio_canal ON public.canales
  FOR SELECT TO authenticated
  USING (
    (select es_cliente())
    AND (EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (select auth.uid()) AND p.canal_id = canales.id
    ))
  );

-- categorias_home
DROP POLICY IF EXISTS "master all categorias_home" ON public.categorias_home;
CREATE POLICY "master all categorias_home" ON public.categorias_home
  FOR ALL TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.rol = 'master'
    )
  );

-- comprobantes
DROP POLICY IF EXISTS cliente_own_comprobantes ON public.comprobantes;
CREATE POLICY cliente_own_comprobantes ON public.comprobantes
  FOR ALL TO authenticated
  USING (
    (select es_cliente())
    AND (EXISTS (
      SELECT 1 FROM pedidos p
      WHERE p.id = comprobantes.pedido_id AND p.cliente_id = (select auth.uid())
    ))
  );

-- pedido_items
DROP POLICY IF EXISTS cliente_own_pedido_items ON public.pedido_items;
CREATE POLICY cliente_own_pedido_items ON public.pedido_items
  FOR ALL TO authenticated
  USING (
    (select es_cliente())
    AND (EXISTS (
      SELECT 1 FROM pedidos p
      WHERE p.id = pedido_items.pedido_id AND p.cliente_id = (select auth.uid())
    ))
  );

-- pedidos — cliente_own
DROP POLICY IF EXISTS cliente_own_pedidos ON public.pedidos;
CREATE POLICY cliente_own_pedidos ON public.pedidos
  FOR ALL TO authenticated
  USING (
    (select es_cliente()) AND cliente_id = (select auth.uid())
  );

-- pedidos — comisionista_own
DROP POLICY IF EXISTS comisionista_own_pedidos ON public.pedidos;
CREATE POLICY comisionista_own_pedidos ON public.pedidos
  FOR ALL TO authenticated
  USING (
    (select get_rol()) = 'comisionista' AND comisionista_id = (select auth.uid())
  );

-- pedidos — empleado_update
DROP POLICY IF EXISTS empleado_update_pedidos ON public.pedidos;
CREATE POLICY empleado_update_pedidos ON public.pedidos
  FOR UPDATE TO authenticated
  USING (
    (select get_rol()) = 'empleado'
    AND (empleado_id = (select auth.uid()) OR empleado_id IS NULL)
  );

-- producto_canales — cliente_read
DROP POLICY IF EXISTS cliente_read_producto_canales ON public.producto_canales;
CREATE POLICY cliente_read_producto_canales ON public.producto_canales
  FOR SELECT TO authenticated
  USING (
    (select es_cliente())
    AND (select cliente_aprobado())
    AND (EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (select auth.uid()) AND p.canal_id = producto_canales.canal_id
    ))
  );

-- productos — cliente_read
DROP POLICY IF EXISTS cliente_read_productos ON public.productos;
CREATE POLICY cliente_read_productos ON public.productos
  FOR SELECT TO authenticated
  USING (
    (select es_cliente())
    AND activo = true
    AND (select cliente_aprobado())
    AND (EXISTS (
      SELECT 1 FROM producto_canales pc
      JOIN profiles p ON p.canal_id = pc.canal_id
      WHERE pc.producto_id = productos.id AND p.id = (select auth.uid())
    ))
  );

-- profiles — cliente_own
DROP POLICY IF EXISTS cliente_own_profile ON public.profiles;
CREATE POLICY cliente_own_profile ON public.profiles
  FOR ALL TO authenticated
  USING (
    (select es_cliente()) AND id = (select auth.uid())
  );

-- profiles — empleado_comisionista_own
DROP POLICY IF EXISTS empleado_comisionista_own_profile ON public.profiles;
CREATE POLICY empleado_comisionista_own_profile ON public.profiles
  FOR SELECT TO authenticated
  USING (
    (select get_rol()) = ANY (ARRAY['empleado'::text, 'comisionista'::text])
    AND id = (select auth.uid())
  );

-- ========== PART 4: RLS INITPLAN — get_rol() ON LARGE TABLES ==========
-- Wrap get_rol() in subquery on tables that scale (productos, pedidos, etc.)

-- productos — empleado_comisionista_read
DROP POLICY IF EXISTS empleado_comisionista_read_productos ON public.productos;
CREATE POLICY empleado_comisionista_read_productos ON public.productos
  FOR SELECT TO authenticated
  USING (
    (select get_rol()) = ANY (ARRAY['empleado'::text, 'comisionista'::text])
    AND activo = true
  );

-- productos — master_all
DROP POLICY IF EXISTS master_all_productos ON public.productos;
CREATE POLICY master_all_productos ON public.productos
  FOR ALL TO authenticated
  USING ((select get_rol()) = 'master');

-- pedidos — master_all
DROP POLICY IF EXISTS master_all_pedidos ON public.pedidos;
CREATE POLICY master_all_pedidos ON public.pedidos
  FOR ALL TO authenticated
  USING ((select get_rol()) = 'master');

-- pedidos — empleado_read
DROP POLICY IF EXISTS empleado_read_pedidos ON public.pedidos;
CREATE POLICY empleado_read_pedidos ON public.pedidos
  FOR SELECT TO authenticated
  USING (
    (select get_rol()) = ANY (ARRAY['empleado'::text, 'comisionista'::text])
    AND estado <> 'borrador'
  );

-- pedido_items — master_all
DROP POLICY IF EXISTS master_all_pedido_items ON public.pedido_items;
CREATE POLICY master_all_pedido_items ON public.pedido_items
  FOR ALL TO authenticated
  USING ((select get_rol()) = 'master');

-- producto_canales — interno_read + master_all
DROP POLICY IF EXISTS interno_read_producto_canales ON public.producto_canales;
CREATE POLICY interno_read_producto_canales ON public.producto_canales
  FOR SELECT TO authenticated
  USING ((select get_rol()) = ANY (ARRAY['empleado'::text, 'comisionista'::text]));

DROP POLICY IF EXISTS master_all_producto_canales ON public.producto_canales;
CREATE POLICY master_all_producto_canales ON public.producto_canales
  FOR ALL TO authenticated
  USING ((select get_rol()) = 'master');

-- producto_fotos — master_all
DROP POLICY IF EXISTS master_all_fotos ON public.producto_fotos;
CREATE POLICY master_all_fotos ON public.producto_fotos
  FOR ALL TO authenticated
  USING ((select get_rol()) = 'master');

-- producto_fotos — interno_cliente_read (uses es_interno + es_cliente, already fixed in functions)
-- (no change needed, the function fixes handle this)

-- profiles — master_all
DROP POLICY IF EXISTS master_all_profiles ON public.profiles;
CREATE POLICY master_all_profiles ON public.profiles
  FOR ALL TO authenticated
  USING ((select get_rol()) = 'master');
