-- Tabla de cuentas sin IVA (múltiples CBUs configurables)
CREATE TABLE public.cuentas_sin_iva (
  id     serial PRIMARY KEY,
  nombre text NOT NULL,
  tipo   text NOT NULL DEFAULT 'CBU' CHECK (tipo = ANY (ARRAY['CBU', 'CVU'])),
  cbu    text NOT NULL DEFAULT '',
  alias  text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cuentas_sin_iva ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON public.cuentas_sin_iva
  FOR SELECT USING (true);

CREATE POLICY "service all" ON public.cuentas_sin_iva
  FOR ALL USING (true) WITH CHECK (true);

-- FK en canales: cada canal mayorista puede tener una cuenta sin IVA asignada
ALTER TABLE public.canales
  ADD COLUMN IF NOT EXISTS cuenta_sin_iva_id integer
    REFERENCES public.cuentas_sin_iva(id) ON DELETE SET NULL;

-- Migrar datos existentes de configuracion → cuentas_sin_iva
DO $$
DECLARE
  v_cbu   text;
  v_alias text;
  v_id    int;
BEGIN
  SELECT valor INTO v_cbu   FROM public.configuracion WHERE clave = 'cbu_sin_iva';
  SELECT valor INTO v_alias FROM public.configuracion WHERE clave = 'alias_sin_iva';
  IF v_cbu IS NOT NULL AND v_cbu <> '' THEN
    INSERT INTO public.cuentas_sin_iva (nombre, cbu, alias)
    VALUES ('Cuenta sin IVA', v_cbu, COALESCE(v_alias, ''))
    RETURNING id INTO v_id;
    UPDATE public.canales SET cuenta_sin_iva_id = v_id WHERE tipo = 'mayorista';
  END IF;
END $$;
