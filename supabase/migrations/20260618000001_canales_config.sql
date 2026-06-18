-- Panel de configuración por canal: formas de pago, descuentos, mínimos, envío, marketing, premios

CREATE TABLE canales_config (
  canal_id                          integer PRIMARY KEY REFERENCES canales(id) ON DELETE CASCADE,

  -- Métodos de pago activos (JSONB, estructura difiere por tipo de canal)
  pagos_habilitados                 jsonb NOT NULL DEFAULT '{}',

  -- Mercado Pago
  cuotas_mp_sin_interes             integer NOT NULL DEFAULT 1,

  -- Descuentos por método (consumidor final)
  desc_transferencia_pct            numeric(5,2) NOT NULL DEFAULT 0,
  desc_efectivo_pct                 numeric(5,2) NOT NULL DEFAULT 0,

  -- Recargo/descuento transferencia (mayoristas)
  recargo_transf_blanco_pct         numeric(5,2) NOT NULL DEFAULT 21,   -- +21% IVA blanco

  -- Descuento autogestión web (mayoristas)
  desc_autogestion_primera_pct      numeric(5,2) NOT NULL DEFAULT 0,
  desc_autogestion_siguientes_pct   numeric(5,2) NOT NULL DEFAULT 0,

  -- Envío
  envio_gratis_desde                numeric(12,2),
  envio_flex_activo                 boolean NOT NULL DEFAULT false,
  envio_amba_gratis_desde           numeric(12,2),

  -- Mínimos de compra
  minimo_compra                     numeric(12,2),
  minimo_compra_trimestral          numeric(12,2),

  -- Vencimiento de pedidos pendientes
  dias_vencimiento_pedido           integer NOT NULL DEFAULT 7,

  -- Visibilidad en la web
  mostrar_direccion_en_web          boolean NOT NULL DEFAULT false,
  whatsapp_tipo                     text NOT NULL DEFAULT 'bot'
                                      CHECK (whatsapp_tipo IN ('bot', 'humano')),

  -- Premios por fidelidad
  premio_diversidad_items_min       integer,
  premio_diversidad_pct             numeric(5,2),
  premio_monto_trimestral_min       numeric(12,2),
  premio_monto_trimestral_pct       numeric(5,2),
  premio_periodicidad_dias_max      integer,
  premio_periodicidad_pct           numeric(5,2),

  -- Marketing / recontacto
  marketing_dias_recontacto         integer NOT NULL DEFAULT 90,
  marketing_mensaje_recontacto      text,
  marketing_link_agendamiento       text,

  actualizado_en                    timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE canales_config ENABLE ROW LEVEL SECURITY;

-- Lectura pública (el carrito necesita leer la config del canal)
CREATE POLICY "canales_config_lectura_publica"
  ON canales_config FOR SELECT
  USING (true);

-- Escritura solo master/empleado
CREATE POLICY "canales_config_escritura_admin"
  ON canales_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND rol IN ('master', 'empleado')
    )
  );

COMMENT ON TABLE canales_config IS 'Configuración de formas de pago, descuentos, mínimos y premios por canal de venta';
