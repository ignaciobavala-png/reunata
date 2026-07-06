-- Historial de cambios de estado de pedidos (auditoría: quién, cuándo, de qué a qué)
CREATE TABLE IF NOT EXISTS public.pedido_estado_historial (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id      uuid        NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  estado_anterior text,
  estado_nuevo   text        NOT NULL,
  usuario_id     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pedido_estado_historial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "master_empleado_ven_historial" ON public.pedido_estado_historial
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND rol IN ('master', 'empleado')
    )
  );

CREATE INDEX IF NOT EXISTS idx_pedido_estado_historial_pedido ON public.pedido_estado_historial (pedido_id, created_at);
