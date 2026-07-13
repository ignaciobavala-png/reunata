-- Recargo configurable por método para los pagos "con IVA" (Factura A) que hasta
-- ahora se cobraban netos: e-cheq al día, cheque físico al día y e-cheq propio.
-- Un porcentaje por método (no descuento, recargo). Default 0 = no cambia el
-- precio actual hasta que el canal lo configure.
ALTER TABLE public.canales_config
  ADD COLUMN IF NOT EXISTS recargo_echeq_al_dia_pct   numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recargo_cheque_al_dia_pct  numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recargo_echeq_propio_pct   numeric(5,2) NOT NULL DEFAULT 0;

ALTER TABLE public.canales_config
  ADD CONSTRAINT canales_config_recargo_echeq_al_dia_rango
    CHECK (recargo_echeq_al_dia_pct >= 0 AND recargo_echeq_al_dia_pct <= 100),
  ADD CONSTRAINT canales_config_recargo_cheque_al_dia_rango
    CHECK (recargo_cheque_al_dia_pct >= 0 AND recargo_cheque_al_dia_pct <= 100),
  ADD CONSTRAINT canales_config_recargo_echeq_propio_rango
    CHECK (recargo_echeq_propio_pct >= 0 AND recargo_echeq_propio_pct <= 100);
