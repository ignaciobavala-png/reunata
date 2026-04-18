import { createClient } from '@/lib/supabase/server'
import { guardarConfiguracion } from '@/app/actions/configuracion'

export default async function ConfiguracionPage({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string }>
}) {
  const { guardado } = await searchParams
  const supabase = await createClient()

  const { data: config } = await supabase
    .from('configuracion')
    .select('clave, valor')

  const cfg = Object.fromEntries((config ?? []).map(r => [r.clave, r.valor ?? '']))

  const { data: canales } = await supabase
    .from('canales')
    .select('id, nombre, slug, lista_precios, politica_pago, condiciones')
    .order('id')

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Configuración
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--color-acero-oscuro)' }}>
        Datos bancarios para cobros y parámetros generales del marketplace.
      </p>

      {guardado && (
        <div className="rounded-lg px-4 py-3 mb-6 text-xs" style={{ background: '#10b98122', color: '#10b981' }}>
          Configuración guardada correctamente.
        </div>
      )}

      <form
        action={async (formData: FormData) => {
          'use server'
          const { createClient: cc } = await import('@/lib/supabase/server')
          const { revalidatePath } = await import('next/cache')
          const { redirect } = await import('next/navigation')
          const sb = await cc()
          const claves = [
            'banco_cbu', 'banco_alias', 'banco_nombre',
            'banco_razon_social', 'banco_cuit',
            'pedido_monto_minimo', 'pedido_dias_vencimiento',
          ]
          const rows = claves.map(clave => ({ clave, valor: (formData.get(clave) as string) ?? '' }))
          await sb.from('configuracion').upsert(rows, { onConflict: 'clave' })
          revalidatePath('/dashboard/admin/configuracion')
          redirect('/dashboard/admin/configuracion?guardado=1')
        }}
      >
        {/* Datos bancarios */}
        <section
          className="rounded-xl border p-6 mb-6"
          style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}
        >
          <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--foreground)' }}>
            Datos bancarios para transferencias
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'banco_cbu',          label: 'CBU' },
              { key: 'banco_alias',        label: 'Alias' },
              { key: 'banco_nombre',       label: 'Banco' },
              { key: 'banco_razon_social', label: 'Razón social / Titular' },
              { key: 'banco_cuit',         label: 'CUIT' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>{label}</label>
                <input
                  name={key}
                  defaultValue={cfg[key] ?? ''}
                  className="w-full px-3 py-2 text-xs rounded-lg border outline-none"
                  style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Parámetros de pedido */}
        <section
          className="rounded-xl border p-6 mb-6"
          style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}
        >
          <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--foreground)' }}>
            Parámetros de pedidos
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>
                Monto mínimo de pedido (USD)
              </label>
              <input
                name="pedido_monto_minimo"
                type="number"
                min="0"
                step="0.01"
                defaultValue={cfg['pedido_monto_minimo'] ?? '0'}
                className="w-full px-3 py-2 text-xs rounded-lg border outline-none"
                style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
              />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>
                Días para vencimiento del pedido
              </label>
              <input
                name="pedido_dias_vencimiento"
                type="number"
                min="1"
                defaultValue={cfg['pedido_dias_vencimiento'] ?? '3'}
                className="w-full px-3 py-2 text-xs rounded-lg border outline-none"
                style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
              />
            </div>
          </div>
        </section>

        <button
          type="submit"
          className="px-6 py-2.5 rounded-lg text-xs transition-colors duration-150"
          style={{ background: 'var(--color-granito)', color: 'var(--color-acero-brillo)' }}
        >
          Guardar configuración
        </button>
      </form>

      {/* Info canales (solo lectura por ahora) */}
      <section className="mt-10">
        <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--foreground)' }}>
          Canales de venta
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(canales ?? []).map(c => (
            <div
              key={c.id}
              className="rounded-xl border p-4"
              style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}
            >
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--foreground)' }}>{c.nombre}</p>
              <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                Lista: <span className="font-mono">{c.lista_precios}</span>
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
