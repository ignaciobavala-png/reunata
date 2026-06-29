import { createClient } from '@/lib/supabase/server'
import { guardarConfiguracion } from '@/app/actions/configuracion'

export default async function ConfiguracionPage({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string; error?: string }>
}) {
  const { guardado, error: errorParam } = await searchParams
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
      <p className="text-base mb-8" style={{ color: 'var(--color-acero-oscuro)' }}>
        Datos bancarios para cobros y parámetros generales del marketplace.
      </p>

      {guardado && (
        <div className="rounded-lg px-4 py-3 mb-6 text-sm" style={{ background: '#10b98122', color: '#10b981' }}>
          Configuración guardada correctamente.
        </div>
      )}
      {errorParam && (
        <div className="rounded-lg px-4 py-3 mb-6 text-sm" style={{ background: '#ef444422', color: '#ef4444' }}>
          No se pudo guardar la configuración. Intentá de nuevo.
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
            'cbu_sin_iva', 'alias_sin_iva',
            'pedido_monto_minimo', 'pedido_dias_vencimiento',
            'banco_imagenes_drive_url',
            'tipo_cambio_usd',
          ]
          const rows = claves.map(clave => ({ clave, valor: (formData.get(clave) as string) ?? '' }))
          const { error } = await sb.from('configuracion').upsert(rows, { onConflict: 'clave' })
          if (error) redirect('/dashboard/admin/configuracion?error=1')
          revalidatePath('/dashboard/admin/configuracion')
          redirect('/dashboard/admin/configuracion?guardado=1')
        }}
      >
        {/* Datos bancarios */}
        <section
          className="rounded-xl border p-6 mb-6"
          style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}
        >
          <h2 className="text-base font-medium mb-4" style={{ color: 'var(--foreground)' }}>
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
                <label className="text-sm font-medium block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>{label}</label>
                <input
                  name={key}
                  defaultValue={cfg[key] ?? ''}
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                  style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Cuenta sin IVA */}
        <section
          className="rounded-xl border p-6 mb-6"
          style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}
        >
          <h2 className="text-base font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            Cuenta sin IVA
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-acero-oscuro)' }}>
            CBU para transferencias sin IVA. Los mayoristas lo ven al elegir esa forma de pago en el carrito.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'cbu_sin_iva',   label: 'CBU sin IVA' },
              { key: 'alias_sin_iva', label: 'Alias sin IVA' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-sm font-medium block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>{label}</label>
                <input
                  name={key}
                  defaultValue={cfg[key] ?? ''}
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
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
          <h2 className="text-base font-medium mb-4" style={{ color: 'var(--foreground)' }}>
            Parámetros de pedidos
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>
                Monto mínimo de pedido (ARS)
              </label>
              <input
                name="pedido_monto_minimo"
                type="number"
                min="0"
                step="0.01"
                defaultValue={cfg['pedido_monto_minimo'] ?? '0'}
                className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>
                Días para vencimiento del pedido
              </label>
              <input
                name="pedido_dias_vencimiento"
                type="number"
                min="1"
                defaultValue={cfg['pedido_dias_vencimiento'] ?? '3'}
                className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
              />
            </div>
          </div>
        </section>

        {/* Tipo de cambio */}
        <section
          className="rounded-xl border p-6 mb-6"
          style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}
        >
          <h2 className="text-base font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            Tipo de cambio
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-acero-oscuro)' }}>
            Cotización del dólar en pesos argentinos. Los productos cargados en USD se convierten automáticamente a ARS en la tienda.
          </p>
          <div className="max-w-xs">
            <label className="text-sm font-medium block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>
              USD → ARS
            </label>
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
                style={{ color: 'var(--color-acero-oscuro)' }}
              >
                1 USD =
              </span>
              <input
                name="tipo_cambio_usd"
                type="number"
                min="1"
                step="0.01"
                defaultValue={cfg['tipo_cambio_usd'] ?? '1'}
                className="w-full pl-16 pr-12 py-2 text-sm rounded-lg border outline-none"
                style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
              />
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
                style={{ color: 'var(--color-acero-oscuro)' }}
              >
                ARS
              </span>
            </div>
          </div>
        </section>

        {/* Banco de imágenes */}
        <section
          className="rounded-xl border p-6 mb-6"
          style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}
        >
          <h2 className="text-base font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            Banco de imágenes
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-acero-oscuro)' }}>
            URL del Google Drive u otro enlace compartido. Solo mayoristas aprobados lo ven.
          </p>
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>
              Enlace al banco de imágenes
            </label>
            <input
              name="banco_imagenes_drive_url"
              type="url"
              placeholder="https://drive.google.com/drive/folders/..."
              defaultValue={cfg['banco_imagenes_drive_url'] ?? ''}
              className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
              style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
            />
          </div>
        </section>

        <button
          type="submit"
          className="px-6 py-2.5 rounded-lg text-sm transition-colors duration-150"
          style={{ background: 'var(--color-granito)', color: 'var(--color-acero-brillo)' }}
        >
          Guardar configuración
        </button>
      </form>

      {/* Info canales (solo lectura por ahora) */}
      <section className="mt-10">
        <h2 className="text-base font-medium mb-4" style={{ color: 'var(--foreground)' }}>
          Canales de venta
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(canales ?? []).map(c => (
            <div
              key={c.id}
              className="rounded-xl border p-4"
              style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}
            >
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>{c.nombre}</p>
              <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
                Lista: <span className="font-mono">{c.lista_precios}</span>
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
