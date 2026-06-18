-- Fase E: seguimiento de actividad de clientes para recontacto
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ultima_compra_en  timestamptz,
  ADD COLUMN IF NOT EXISTS requiere_recontacto boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_recontacto
  ON profiles (requiere_recontacto)
  WHERE requiere_recontacto = true;

-- Función llamada por el cron diario para marcar clientes inactivos
CREATE OR REPLACE FUNCTION marcar_clientes_para_recontacto()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE profiles p
  SET requiere_recontacto = true
  FROM canales_config cc
  WHERE p.canal_id = cc.canal_id
    AND p.rol IN ('distribuidor', 'local', 'mercha')
    AND p.aprobado = true
    AND (
      p.ultima_compra_en IS NULL
        AND p.created_at < now() - (cc.marketing_dias_recontacto || ' days')::interval
      OR
      p.ultima_compra_en < now() - (cc.marketing_dias_recontacto || ' days')::interval
    );
$$;
