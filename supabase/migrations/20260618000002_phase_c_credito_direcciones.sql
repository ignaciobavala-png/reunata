-- Phase C: solicitudes_credito + direcciones_entrega + FK en pedidos

-- ── solicitudes_credito ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.solicitudes_credito (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  monto        numeric,
  plazo_dias   integer,
  garantias    text,
  notas        text,
  estado       text        NOT NULL DEFAULT 'pendiente'
                           CHECK (estado IN ('pendiente', 'aprobado', 'rechazado', 'cancelado')),
  respuesta    text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.solicitudes_credito ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cliente_own_solicitudes" ON public.solicitudes_credito
  FOR ALL
  USING  (auth.uid() = cliente_id)
  WITH CHECK (auth.uid() = cliente_id);

CREATE POLICY "master_empleado_solicitudes" ON public.solicitudes_credito
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND rol IN ('master', 'empleado')
    )
  );

CREATE INDEX IF NOT EXISTS idx_solicitudes_cliente ON public.solicitudes_credito (cliente_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado  ON public.solicitudes_credito (estado);

-- ── direcciones_entrega ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.direcciones_entrega (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  alias          text        NOT NULL DEFAULT '',
  calle          text        NOT NULL DEFAULT '',
  numero         text        NOT NULL DEFAULT '',
  piso           text,
  localidad      text        NOT NULL DEFAULT '',
  provincia      text        NOT NULL DEFAULT '',
  codigo_postal  text        NOT NULL DEFAULT '',
  predeterminada boolean     NOT NULL DEFAULT false,
  activa         boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.direcciones_entrega ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cliente_own_direcciones" ON public.direcciones_entrega
  FOR ALL
  USING  (auth.uid() = cliente_id)
  WITH CHECK (auth.uid() = cliente_id);

CREATE POLICY "master_empleado_ver_direcciones" ON public.direcciones_entrega
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND rol IN ('master', 'empleado')
    )
  );

CREATE INDEX IF NOT EXISTS idx_direcciones_cliente ON public.direcciones_entrega (cliente_id);

-- ── FK en pedidos ──────────────────────────────────────────────────────────
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS direccion_entrega_id uuid
  REFERENCES public.direcciones_entrega(id) ON DELETE SET NULL;
