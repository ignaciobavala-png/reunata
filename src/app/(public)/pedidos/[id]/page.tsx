import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PagoInstrucciones } from './PagoInstrucciones'
import { ComprobanteUploader } from './ComprobanteUploader'

export const metadata: Metadata = { robots: { index: false, follow: false } }

const ESTADO_LABEL: Record<string, string> = {
  pendiente_pago:     'Pendiente de pago',
  comprobante_subido: 'Comprobante enviado',
  pago_confirmado:    'Pago confirmado',
  en_preparacion:     'En preparación',
  enviado:            'Enviado',
  entregado:          'Entregado',
  cancelado:          'Cancelado',
}

const ESTADO_COLOR: Record<string, { bg: string; text: string }> = {
  pendiente_pago:     { bg: '#f59e0b22', text: '#f59e0b' },
  comprobante_subido: { bg: '#6366f122', text: '#6366f1' },
  pago_confirmado:    { bg: '#0ea5e922', text: '#0ea5e9' },
  en_preparacion:     { bg: '#8b5cf622', text: '#8b5cf6' },
  enviado:            { bg: '#06b6d422', text: '#06b6d4' },
  entregado:          { bg: '#10b98122', text: '#10b981' },
  cancelado:          { bg: '#ef444422', text: '#ef4444' },
}

export default async function DetallePedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/pedidos/${id}`)

  const { data: pedido } = await supabase
    .from('pedidos')
    .select(`
      id, estado, medio_pago, total_usd, notas, created_at,
      pedido_items (
        id, cantidad, precio_unit,
        producto:producto_id ( id, codigo_interno, titulo )
      )
    `)
    .eq('id', id)
    .eq('cliente_id', user.id)
    .single()

  if (!pedido) notFound()

  const { data: config } = await supabase
    .from('configuracion')
    .select('clave, valor')

  const cfg = Object.fromEntries((config ?? []).map(r => [r.clave, r.valor ?? '']))

  const col = ESTADO_COLOR[pedido.estado] ?? { bg: '#88888822', text: '#888' }
  const mostrarInstrucciones = ['pendiente_pago', 'comprobante_subido'].includes(pedido.estado)

  return (
    <main className="pt-36 pb-24 px-6 md:px-16 max-w-2xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
            Pedido #{id.slice(-8).toUpperCase()}
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
            {new Date(pedido.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <span className="text-sm px-3 py-1.5 rounded-full" style={{ background: col.bg, color: col.text }}>
          {ESTADO_LABEL[pedido.estado] ?? pedido.estado}
        </span>
      </div>

      <div className="rounded-xl border overflow-hidden mb-6" style={{ borderColor: 'var(--color-acero-claro)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--color-acero-brillo)' }}>
              <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>Producto</th>
              <th className="text-right px-4 py-2.5 font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>Cant.</th>
              <th className="text-right px-4 py-2.5 font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>Precio</th>
              <th className="text-right px-4 py-2.5 font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(pedido.pedido_items ?? []).map((item, i) => {
              const prod = item.producto as unknown as { codigo_interno: string; titulo: string } | null
              return (
                <tr
                  key={item.id}
                  style={{
                    background: i % 2 === 0 ? 'white' : 'var(--color-acero-brillo)',
                    borderTop: '1px solid var(--color-acero-claro)',
                  }}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono mr-2" style={{ color: 'var(--color-acero-oscuro)' }}>
                      {prod?.codigo_interno}
                    </span>
                    <span style={{ color: 'var(--foreground)' }}>{prod?.titulo}</span>
                  </td>
                  <td className="px-4 py-3 text-right" style={{ color: 'var(--foreground)' }}>{item.cantidad}</td>
                  <td className="px-4 py-3 text-right" style={{ color: 'var(--color-acero-oscuro)' }}>
                    u$s {Number(item.precio_unit).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium" style={{ color: 'var(--foreground)' }}>
                    u$s {(Number(item.precio_unit) * item.cantidad).toFixed(2)}
                  </td>
                </tr>
              )
            })}
            <tr style={{ borderTop: '2px solid var(--color-acero-claro)', background: 'var(--color-acero-brillo)' }}>
              <td colSpan={3} className="px-4 py-3 text-right font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                Total
              </td>
              <td className="px-4 py-3 text-right font-medium text-base" style={{ color: 'var(--foreground)' }}>
                u$s {Number(pedido.total_usd).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {mostrarInstrucciones && (
        <PagoInstrucciones
          pedidoId={pedido.id}
          total={Number(pedido.total_usd)}
          cfg={cfg}
          estado={pedido.estado}
        />
      )}

      {pedido.estado === 'pendiente_pago' && (
        <ComprobanteUploader pedidoId={pedido.id} />
      )}
    </main>
  )
}
