import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PagoInstrucciones } from './PagoInstrucciones'
import { ComprobanteUploader } from './ComprobanteUploader'
import { formatPrecio } from '@/lib/utils'
import { getCuentaSinIvaDelUsuario } from '@/lib/tienda'

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
  if (!user) redirect('/login')

  const { data: pedido } = await supabase
    .from('pedidos')
    .select(`
      id, numero, estado, medio_pago, total_usd, costo_envio, envio_descripcion, notas, created_at, expira_en,
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
  const mostrarInstrucciones = ['pendiente_pago', 'comprobante_subido', 'borrador'].includes(pedido.estado)
  const esBorrador = pedido.estado === 'borrador'
  const expiraEn = (pedido as { expira_en?: string | null }).expira_en
  const diasRestantes = esBorrador && expiraEn
    ? Math.ceil((new Date(expiraEn).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  // Transferencia sin IVA: los datos son de la cuenta asignada al canal, no del banco oficial
  const cuentaSinIva = mostrarInstrucciones && pedido.medio_pago === 'transferencia_cueva'
    ? await getCuentaSinIvaDelUsuario(user.id)
    : null

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
            Pedido #{pedido.numero}
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
            {new Date(pedido.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <span className="text-sm px-3 py-1.5 rounded-full" style={{ background: col.bg, color: col.text }}>
          {ESTADO_LABEL[pedido.estado] ?? pedido.estado}
        </span>
      </div>

      {/* Items */}
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
                    {formatPrecio(Number(item.precio_unit))}
                  </td>
                  <td className="px-4 py-3 text-right font-medium" style={{ color: 'var(--foreground)' }}>
                    {formatPrecio(Number(item.precio_unit) * item.cantidad)}
                  </td>
                </tr>
              )
            })}
            {(pedido.costo_envio ?? 0) > 0 && (
              <>
                <tr style={{ borderTop: '1px solid var(--color-acero-claro)', background: 'var(--color-acero-brillo)' }}>
                  <td colSpan={3} className="px-4 py-2 text-right text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
                    Subtotal productos
                  </td>
                  <td className="px-4 py-2 text-right text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
                    {formatPrecio(Number(pedido.total_usd) - Number(pedido.costo_envio))}
                  </td>
                </tr>
                <tr style={{ background: 'var(--color-acero-brillo)' }}>
                  <td colSpan={3} className="px-4 py-2 text-right text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
                    {pedido.envio_descripcion ? `Envío · ${pedido.envio_descripcion}` : 'Envío'}
                  </td>
                  <td className="px-4 py-2 text-right text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
                    {formatPrecio(Number(pedido.costo_envio))}
                  </td>
                </tr>
              </>
            )}
            <tr style={{ borderTop: '2px solid var(--color-acero-claro)', background: 'var(--color-acero-brillo)' }}>
              <td colSpan={3} className="px-4 py-3 text-right font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                Total
              </td>
              <td className="px-4 py-3 text-right font-medium text-base" style={{ color: 'var(--foreground)' }}>
                {formatPrecio(Number(pedido.total_usd))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Aviso de vencimiento para borradores */}
      {esBorrador && diasRestantes !== null && (
        <div className="rounded-xl border px-4 py-3 mb-4 text-sm"
          style={{ background: diasRestantes <= 2 ? '#fee2e215' : '#fff7ed', borderColor: diasRestantes <= 2 ? '#fca5a5' : '#fed7aa', color: diasRestantes <= 2 ? '#dc2626' : '#92400e' }}>
          {diasRestantes > 0
            ? `Este borrador vence en ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}. Subí el comprobante para asegurar tu pedido.`
            : 'Este borrador vence hoy. Subí el comprobante para no perder tu lugar.'}
        </div>
      )}

      {/* Instrucciones de pago */}
      {mostrarInstrucciones && (
        <PagoInstrucciones
          numero={pedido.numero}
          total={Number(pedido.total_usd)}
          costoEnvio={pedido.costo_envio ? Number(pedido.costo_envio) : undefined}
          cfg={cfg}
          estado={pedido.estado}
          medioPago={pedido.medio_pago}
          cuentaSinIva={cuentaSinIva}
        />
      )}

      {/* Uploader de comprobante */}
      {['pendiente_pago', 'borrador'].includes(pedido.estado) && (
        <ComprobanteUploader pedidoId={pedido.id} />
      )}
    </div>
  )
}
