'use client'

import { useState, useTransition } from 'react'
import { X, ChevronDown, Loader2, Check } from 'lucide-react'
import { guardarCanalConfig, type CanalConfigPayload } from '@/app/actions/canales-config'

type Canal = { id: number; slug: string; nombre: string; activo: boolean; categoria_comercial: 'minorista' | 'mayorista' | 'especial' }
type Config = Record<string, unknown>
export type CuentaSinIva = { id: number; nombre: string; tipo?: string; cbu: string; alias: string; cuit?: string | null; banco?: string | null }

const COLORES_CANAL: Record<string, string> = {
  consumidor_final: '#6366f1',
  distribuidor:     '#0ea5e9',
  local:            '#10b981',
  mercha:           '#f59e0b',
  fabricantes:      '#64748b',
}

// Métodos de pago por tipo de canal
const PAGOS_CONSUMIDOR = [
  { key: 'mercado_pago',  label: 'Mercado Pago' },
  { key: 'transferencia', label: 'Transferencia' },
  { key: 'efectivo',      label: 'Efectivo' },
]
const PAGOS_MAYORISTA_CONTADO = [
  { key: 'efectivo',               label: 'Efectivo' },
  { key: 'transferencia_blanco',   label: 'Transferencia (Factura A)' },
  { key: 'transferencia_negro',    label: 'Transferencia Directa' },
  { key: 'echeq_al_dia',           label: 'E-cheq al día' },
  { key: 'cheque_fisico_al_dia',   label: 'Cheque físico al día' },
]
const PAGOS_MAYORISTA_FINANCIADO = [
  { key: 'echeq_propio',           label: 'E-cheq propio' },
  { key: 'echeq_tercero',          label: 'E-cheq de tercero' },
  { key: 'cheque_fisico_financiado', label: 'Cheque físico' },
]

function buildDefaultConfig(canal: Canal): CanalConfigPayload {
  const isMayorista = canal.categoria_comercial === 'mayorista'
  const pagos: Record<string, { activo: boolean }> = {}
  const methods = isMayorista
    ? [...PAGOS_MAYORISTA_CONTADO, ...PAGOS_MAYORISTA_FINANCIADO]
    : PAGOS_CONSUMIDOR
  for (const m of methods) pagos[m.key] = { activo: false }
  return {
    canal_id: canal.id,
    cuenta_sin_iva_id: null,
    pagos_habilitados: pagos,
    cuotas_mp_sin_interes: 1,
    desc_transferencia_pct: 0,
    desc_efectivo_pct: 0,
    recargo_transf_blanco_pct: 21,
    desc_autogestion_primera_pct: 0,
    desc_autogestion_siguientes_pct: 0,
    desc_volumen_monto_min: null,
    desc_volumen_pct: null,
    envio_gratis_desde: null,
    envio_flex_activo: false,
    envio_amba_gratis_desde: null,
    minimo_compra: null,
    minimo_compra_trimestral: null,
    dias_vencimiento_pedido: 7,
    mostrar_direccion_en_web: false,
    direccion_negocio: null,
    whatsapp_tipo: 'bot',
    premio_diversidad_items_min: null,
    premio_diversidad_pct: null,
    premio_monto_trimestral_min: null,
    premio_monto_trimestral_pct: null,
    premio_periodicidad_dias_max: null,
    premio_periodicidad_pct: null,
    marketing_dias_recontacto: 90,
    marketing_mensaje_recontacto: '',
    marketing_link_agendamiento: '',
  }
}

function mergeConfig(canal: Canal, saved: Config | undefined): CanalConfigPayload {
  const defaults = buildDefaultConfig(canal)
  if (!saved) return defaults
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { actualizado_en: _, ...savedClean } = saved as Record<string, unknown>
  return {
    ...defaults,
    ...savedClean,
    canal_id: canal.id,
    pagos_habilitados: (saved.pagos_habilitados as Record<string, { activo: boolean }>) ?? defaults.pagos_habilitados,
  } as CanalConfigPayload
}

// Sección colapsable
function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b" style={{ borderColor: 'var(--color-acero-claro)' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium transition-colors"
        style={{ color: 'var(--foreground)' }}
      >
        {title}
        <ChevronDown
          size={15}
          className="transition-transform duration-200"
          style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', color: 'var(--color-acero-oscuro)' }}
        />
      </button>
      {open && <div className="px-5 pb-5 space-y-4">{children}</div>}
    </div>
  )
}

// Campo numérico pequeño
function NumField({ label, value, onChange, suffix, prefix }: {
  label: string; value: number | null; onChange: (v: number | null) => void
  suffix?: string; prefix?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm flex-1" style={{ color: 'var(--color-acero-oscuro)' }}>{label}</label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>{prefix}</span>}
        <input
          type="number"
          min="0"
          step="any"
          value={value ?? ''}
          onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
          className="w-24 px-2 py-1.5 text-sm rounded border outline-none text-right"
          style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
        />
        {suffix && <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>{suffix}</span>}
      </div>
    </div>
  )
}

// Toggle de método de pago
function PagoToggle({ label, activo, onChange }: { label: string; activo: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none py-1">
      <div
        onClick={() => onChange(!activo)}
        className="w-9 h-5 rounded-full relative transition-colors cursor-pointer flex-shrink-0"
        style={{ background: activo ? '#10b981' : 'var(--color-acero-claro)' }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
          style={{ transform: activo ? 'translateX(16px)' : 'translateX(2px)' }}
        />
      </div>
      <span className="text-sm" style={{ color: 'var(--foreground)' }}>{label}</span>
    </label>
  )
}

export function CanalConfigDrawer({
  canal,
  configInicial,
  cuentasSinIva = [],
  cuentaSinIvaActualId,
  onClose,
  onSaved,
}: {
  canal: Canal
  configInicial: Config | undefined
  cuentasSinIva?: CuentaSinIva[]
  cuentaSinIvaActualId?: number | null
  onClose: () => void
  onSaved: (canalId: number, config: CanalConfigPayload) => void
}) {
  const isMayorista = canal.categoria_comercial === 'mayorista'
  const color = COLORES_CANAL[canal.slug] ?? '#94a3b8'

  const [form, setForm] = useState<CanalConfigPayload>(() => ({
    ...mergeConfig(canal, configInicial),
    cuenta_sin_iva_id: cuentaSinIvaActualId ?? null,
  }))
  const [, startTransition] = useTransition()
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof CanalConfigPayload>(key: K, value: CanalConfigPayload[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    setGuardado(false)
  }

  function togglePago(key: string, activo: boolean) {
    setForm(prev => ({
      ...prev,
      pagos_habilitados: { ...prev.pagos_habilitados, [key]: { activo } },
    }))
    setGuardado(false)
  }

  function handleGuardar() {
    setGuardando(true)
    setError(null)
    startTransition(async () => {
      const res = await guardarCanalConfig(form)
      setGuardando(false)
      if (res.ok) {
        setGuardado(true)
        onSaved(canal.id, form)
      } else {
        setError(res.error ?? 'Error al guardar')
      }
    })
  }

  // Los premios no tienen columna on/off: activo = algún campo cargado.
  // El toggle apagado vacía los 6 campos para que el guardado los desactive de verdad.
  const [premiosActivos, setPremiosActivos] = useState(() =>
    form.premio_diversidad_items_min != null || form.premio_diversidad_pct != null ||
    form.premio_monto_trimestral_min != null || form.premio_monto_trimestral_pct != null ||
    form.premio_periodicidad_dias_max != null || form.premio_periodicidad_pct != null
  )

  function togglePremios(activos: boolean) {
    setPremiosActivos(activos)
    if (!activos) {
      setForm(prev => ({
        ...prev,
        premio_diversidad_items_min: null,
        premio_diversidad_pct: null,
        premio_monto_trimestral_min: null,
        premio_monto_trimestral_pct: null,
        premio_periodicidad_dias_max: null,
        premio_periodicidad_pct: null,
      }))
    }
    setGuardado(false)
  }

  const pagos = form.pagos_habilitados

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col shadow-2xl overflow-hidden"
        style={{ width: 480, background: 'white' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0 border-b"
          style={{ borderColor: 'var(--color-acero-claro)' }}
        >
          <div className="flex items-center gap-3">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ background: color }}
            />
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
                {canal.nombre}
              </h2>
              <p className="text-xs font-mono" style={{ color: 'var(--color-acero-oscuro)' }}>
                {canal.slug}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} style={{ color: 'var(--color-acero-oscuro)' }} />
          </button>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="flex-1 overflow-y-auto" data-lenis-prevent>

          {/* ── Formas de pago ── */}
          <Section title="Formas de pago" defaultOpen>
            {!isMayorista && (
              <>
                {PAGOS_CONSUMIDOR.map(m => (
                  <div key={m.key}>
                    <PagoToggle
                      label={m.label}
                      activo={pagos[m.key]?.activo ?? false}
                      onChange={v => togglePago(m.key, v)}
                    />
                    {m.key === 'mercado_pago' && pagos['mercado_pago']?.activo && (
                      <div className="ml-12 mt-1">
                        <NumField
                          label="Cuotas sin interés hasta"
                          value={form.cuotas_mp_sin_interes}
                          onChange={v => set('cuotas_mp_sin_interes', v ?? 1)}
                          suffix="cuotas"
                        />
                      </div>
                    )}
                    {m.key === 'transferencia' && pagos['transferencia']?.activo && (
                      <div className="ml-12 mt-1">
                        <NumField
                          label="Descuento por transferencia"
                          value={form.desc_transferencia_pct}
                          onChange={v => set('desc_transferencia_pct', v ?? 0)}
                          suffix="%"
                        />
                      </div>
                    )}
                    {m.key === 'efectivo' && pagos['efectivo']?.activo && (
                      <div className="ml-12 mt-1">
                        <NumField
                          label="Descuento por efectivo"
                          value={form.desc_efectivo_pct}
                          onChange={v => set('desc_efectivo_pct', v ?? 0)}
                          suffix="%"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            {isMayorista && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-acero-oscuro)' }}>
                  Contado — pago previo a entrega
                </p>
                {PAGOS_MAYORISTA_CONTADO.map(m => (
                  <div key={m.key}>
                    <PagoToggle
                      label={m.label}
                      activo={pagos[m.key]?.activo ?? false}
                      onChange={v => togglePago(m.key, v)}
                    />
                    {m.key === 'efectivo' && pagos['efectivo']?.activo && (
                      <div className="ml-12 mt-1">
                        <NumField
                          label="Descuento por efectivo"
                          value={form.desc_efectivo_pct}
                          onChange={v => set('desc_efectivo_pct', v ?? 0)}
                          suffix="%"
                        />
                      </div>
                    )}
                    {m.key === 'transferencia_blanco' && pagos['transferencia_blanco']?.activo && (
                      <div className="ml-12 mt-1">
                        <NumField
                          label="Recargo IVA blanco"
                          value={form.recargo_transf_blanco_pct}
                          onChange={v => set('recargo_transf_blanco_pct', v ?? 21)}
                          suffix="%"
                        />
                      </div>
                    )}
                  </div>
                ))}

                <p className="text-xs font-semibold uppercase tracking-wide mt-4 mb-2" style={{ color: 'var(--color-acero-oscuro)' }}>
                  Financiado — requiere formulario de crédito aprobado
                </p>
                {PAGOS_MAYORISTA_FINANCIADO.map(m => (
                  <PagoToggle
                    key={m.key}
                    label={m.label}
                    activo={pagos[m.key]?.activo ?? false}
                    onChange={v => togglePago(m.key, v)}
                  />
                ))}

                <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-acero-claro)' }}>
                  <NumField
                    label="Cuotas sin interés (MP)"
                    value={form.cuotas_mp_sin_interes}
                    onChange={v => set('cuotas_mp_sin_interes', v ?? 1)}
                    suffix="cuotas"
                  />
                </div>

                {cuentasSinIva.length > 0 && (
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-acero-claro)' }}>
                    <div className="flex items-center gap-3">
                      <label className="text-sm flex-1" style={{ color: 'var(--color-acero-oscuro)' }}>
                        Cuenta sin IVA (transferencia negro)
                      </label>
                      <select
                        value={form.cuenta_sin_iva_id ?? ''}
                        onChange={e => set('cuenta_sin_iva_id', e.target.value ? Number(e.target.value) : null)}
                        className="w-48 px-2 py-1.5 text-sm rounded border outline-none"
                        style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
                      >
                        <option value="">Sin asignar</option>
                        {cuentasSinIva.map(c => (
                          <option key={c.id} value={c.id}>{c.nombre} ({c.tipo ?? 'CBU'})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </>
            )}
          </Section>

          {/* ── Descuentos ── */}
          <Section title="Descuentos">
            {isMayorista && (
              <>
                <NumField
                  label="Primera compra web"
                  value={form.desc_autogestion_primera_pct}
                  onChange={v => set('desc_autogestion_primera_pct', v ?? 0)}
                  suffix="% descuento"
                />
                <NumField
                  label="Compras siguientes"
                  value={form.desc_autogestion_siguientes_pct}
                  onChange={v => set('desc_autogestion_siguientes_pct', v ?? 0)}
                  suffix="% descuento"
                />
              </>
            )}

            <div className={isMayorista ? 'space-y-3 pt-3 border-t' : 'space-y-3'} style={isMayorista ? { borderColor: 'var(--color-acero-claro)' } : undefined}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-acero-oscuro)' }}>
                Descuento por volumen de compra
              </p>
              <NumField
                label="Superando un total de"
                value={form.desc_volumen_monto_min}
                onChange={v => set('desc_volumen_monto_min', v)}
                prefix="AR$"
              />
              <NumField
                label="Descuento a otorgar"
                value={form.desc_volumen_pct}
                onChange={v => set('desc_volumen_pct', v)}
                suffix="%"
              />
              <p className="text-xs leading-snug" style={{ color: 'var(--color-acero-oscuro)' }}>
                Se aplica sobre el total de la compra cuando supera el monto. Completá ambos campos o dejá ambos vacíos para desactivarlo.
              </p>
            </div>

            {!isMayorista && (
              <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
                Códigos de descuento y gift cards se configuran en secciones separadas (próximamente).
              </p>
            )}
          </Section>

          {/* ── Mínimos de compra ── */}
          <Section title="Mínimos de compra">
            <NumField
              label="Mínimo por pedido"
              value={form.minimo_compra}
              onChange={v => set('minimo_compra', v)}
              prefix="AR$"
            />
            {isMayorista && (
              <NumField
                label="Mínimo trimestral para mantener status"
                value={form.minimo_compra_trimestral}
                onChange={v => set('minimo_compra_trimestral', v)}
                prefix="AR$"
              />
            )}
          </Section>

          {/* ── Envío ── */}
          <Section title="Envío">
            <NumField
              label="Envío gratis desde"
              value={form.envio_gratis_desde}
              onChange={v => set('envio_gratis_desde', v)}
              prefix="AR$"
            />
            {isMayorista && (
              <NumField
                label="Envío gratis en AMBA desde"
                value={form.envio_amba_gratis_desde}
                onChange={v => set('envio_amba_gratis_desde', v)}
                prefix="AR$"
              />
            )}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => set('envio_flex_activo', !form.envio_flex_activo)}
                className="w-9 h-5 rounded-full relative transition-colors cursor-pointer flex-shrink-0"
                style={{ background: form.envio_flex_activo ? '#10b981' : 'var(--color-acero-claro)' }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
                  style={{ transform: form.envio_flex_activo ? 'translateX(16px)' : 'translateX(2px)' }}
                />
              </div>
              <span className="text-sm" style={{ color: 'var(--foreground)' }}>Envío Flex habilitado</span>
            </label>
          </Section>

          {/* ── Contacto y web ── */}
          <Section title="Contacto y web">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => set('mostrar_direccion_en_web', !form.mostrar_direccion_en_web)}
                className="w-9 h-5 rounded-full relative transition-colors cursor-pointer flex-shrink-0"
                style={{ background: form.mostrar_direccion_en_web ? '#10b981' : 'var(--color-acero-claro)' }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
                  style={{ transform: form.mostrar_direccion_en_web ? 'translateX(16px)' : 'translateX(2px)' }}
                />
              </div>
              <span className="text-sm" style={{ color: 'var(--foreground)' }}>Mostrar dirección del negocio en la web</span>
            </label>
            {form.mostrar_direccion_en_web && (
              <div className="ml-12 space-y-1">
                <label className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>Dirección a mostrar</label>
                <input
                  type="text"
                  value={form.direccion_negocio ?? ''}
                  onChange={e => set('direccion_negocio', e.target.value || null)}
                  placeholder="Ej: Av. Corrientes 1234, CABA"
                  className="w-full px-2 py-1.5 text-sm rounded border outline-none"
                  style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
                />
              </div>
            )}

            <div className="flex items-center gap-3">
              <span className="text-sm flex-1" style={{ color: 'var(--color-acero-oscuro)' }}>Tipo de WhatsApp</span>
              <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-acero-claro)' }}>
                {(['bot', 'humano'] as const).map(tipo => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => set('whatsapp_tipo', tipo)}
                    className="px-3 py-1.5 text-sm capitalize transition-colors"
                    style={{
                      background: form.whatsapp_tipo === tipo ? 'var(--color-granito-oscuro)' : 'white',
                      color: form.whatsapp_tipo === tipo ? 'white' : 'var(--color-acero-oscuro)',
                    }}
                  >
                    {tipo}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* ── Pedidos ── */}
          <Section title="Pedidos">
            <NumField
              label="Días para vencimiento de pedido pendiente"
              value={form.dias_vencimiento_pedido}
              onChange={v => set('dias_vencimiento_pedido', v ?? 7)}
              suffix="días"
            />
          </Section>

          {/* ── Premios por fidelidad ── */}
          <Section title="Premios por fidelidad">
            <PagoToggle
              label={premiosActivos ? 'Activados' : 'Desactivados'}
              activo={premiosActivos}
              onChange={togglePremios}
            />
            {premiosActivos && (<>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-acero-oscuro)' }}>
                Diversidad de artículos
              </p>
              <NumField
                label="Ítems distintos mínimo"
                value={form.premio_diversidad_items_min}
                onChange={v => set('premio_diversidad_items_min', v)}
                suffix="ítems"
              />
              <NumField
                label="Descuento a otorgar"
                value={form.premio_diversidad_pct}
                onChange={v => set('premio_diversidad_pct', v)}
                suffix="%"
              />
            </div>

            <div className="space-y-3 pt-3 border-t" style={{ borderColor: 'var(--color-acero-claro)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-acero-oscuro)' }}>
                Monto trimestral
              </p>
              <NumField
                label="Monto mínimo"
                value={form.premio_monto_trimestral_min}
                onChange={v => set('premio_monto_trimestral_min', v)}
                prefix="AR$"
              />
              <NumField
                label="Descuento a otorgar"
                value={form.premio_monto_trimestral_pct}
                onChange={v => set('premio_monto_trimestral_pct', v)}
                suffix="%"
              />
            </div>

            <div className="space-y-3 pt-3 border-t" style={{ borderColor: 'var(--color-acero-claro)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-acero-oscuro)' }}>
                Periodicidad de compra
              </p>
              <NumField
                label="Compra cada como máximo"
                value={form.premio_periodicidad_dias_max}
                onChange={v => set('premio_periodicidad_dias_max', v)}
                suffix="días"
              />
              <NumField
                label="Descuento a otorgar"
                value={form.premio_periodicidad_pct}
                onChange={v => set('premio_periodicidad_pct', v)}
                suffix="%"
              />
            </div>
            </>)}
          </Section>

          {/* ── Marketing / recontacto ── */}
          <Section title="Marketing y recontacto">
            <NumField
              label="Días sin compra para marcar como inactivo"
              value={form.marketing_dias_recontacto}
              onChange={v => set('marketing_dias_recontacto', v ?? 90)}
              suffix="días"
            />
            <div className="space-y-1.5">
              <label className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
                Mensaje de recontacto
              </label>
              <textarea
                value={form.marketing_mensaje_recontacto}
                onChange={e => set('marketing_mensaje_recontacto', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm rounded border outline-none resize-none"
                style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
                placeholder="Hola {nombre}, hace un tiempo que no te vemos..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
                Link de agendamiento (Calendly, Google Calendar…)
              </label>
              <input
                type="url"
                value={form.marketing_link_agendamiento}
                onChange={e => set('marketing_link_agendamiento', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded border outline-none"
                style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
                placeholder="https://calendly.com/..."
              />
            </div>
          </Section>

        </div>

        {/* Footer */}
        <div
          className="px-5 py-4 border-t flex items-center gap-3 flex-shrink-0"
          style={{ borderColor: 'var(--color-acero-claro)' }}
        >
          {error && (
            <p className="text-xs flex-1" style={{ color: '#dc2626' }}>{error}</p>
          )}
          {guardado && !error && (
            <p className="text-xs flex-1 flex items-center gap-1" style={{ color: '#16a34a' }}>
              <Check size={12} /> Guardado
            </p>
          )}
          {!guardado && !error && <span className="flex-1" />}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border transition-colors"
            style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={guardando}
            className="px-5 py-2 text-sm rounded-lg font-medium text-white transition-opacity disabled:opacity-60 flex items-center gap-2"
            style={{ background: color }}
          >
            {guardando && <Loader2 size={13} className="animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </>
  )
}
