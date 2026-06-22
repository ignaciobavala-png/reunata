import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { formatPrecio } from '@/lib/utils'
import { EstadoActions } from './EstadoActions'

const ESTADO_LABEL: Record<string, string> = {
  borrador:           'Borrador',
  pendiente_pago:     'Pendiente de pago',
  comprobante_subido: 'Comprobante subido',
  pago_confirmado:    'Pago confirmado',
  en_preparacion:     'En preparación',
  enviado:            'Enviado',
  entregado:          'Entregado',
  cancelado:          'Cancelado',
}

const COLOR_ESTADO: Record<string, { bg: string; text: string }> = {
  borrador:           { bg: '#88888822', text: '#888888' },
  pendiente_pago:     { bg: '#f59e0b22', text: '#f59e0b' },
  comprobante_subido: { bg: '#6366f122', text: '#6366f1' },
  pago_confirmado:    { bg: '#0ea5e922', text: '#0ea5e9' },
  en_preparacion:     { bg: '#8b5cf622', text: '#8b5cf6' },
  enviado:            { bg: '#06b6d422', text: '#06b6d4' },
  entregado:          { bg: '#10b98122', text: '#10b981' },
  cancelado:          { bg: '#ef444422', text: '#ef4444' },
}

export default async function AdminDetallePedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const service = createServiceClient()

  const { data: pedido } = await supabase
    .from('pedidos')
    .select(`
      id, numero, estado, medio_pago, referencia_pago, total_usd, costo_envio, envio_descripcion,
      notas, created_at, fecha_pago, mp_preference_id, mp_payment_id,
      guest_nombre, guest_email, guest_telefono,
      pedido_items (
        id, cantidad, precio_unit, variante,
        producto:producto_id ( id, codigo_interno, titulo )
      ),
      cliente:cliente_id ( nombre, email, telefono, rol )
    `)
    .eq('id', id)
    .single()

  if (!pedido) notFound()

  const { data: comprobantes } = await service
    .from('comprobantes')
    .select('id, url, subido_at')
    .eq('pedido_id', id)
    .order('subido_at', { ascending: false })

  // Generar signed URLs para comprobantes (bucket multimedia, 1h)
  const comprobantesConUrl = await Promise.all(
    (comprobantes ?? []).map(async c => {
      const { data } = await service.storage.from('multimedia').createSignedUrl(c.url, 3600)
      return { ...c, signedUrl: data?.signedUrl ?? null }
    })
  )

  const col = COLOR_ESTADO[pedido.estado] ?? { bg: '#88888822', text: '#888888' }
  const cliente = pedido.cliente as { nombre?: string; email?: string; telefono?: string; rol?: string } | null
  const esGuest = !cliente

  const nombreCliente = cliente?.nombre ?? (pedido as any).guest_nombre ?? '—'
  const emailCliente  = cliente?.email  ?? (pedido as any).guest_email  ?? ''
  const telCliente    = cliente?.telefono ?? (pedido as any).guest_telefono ?? ''

  return (
    <div className="p-8 max-w-3xl">
      {/* Back + header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link
            href="/dashboard/admin/pedidos"
            className="inline-flex items-center gap-1.5 text-sm mb-3 transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-acero-oscuro)' }}
          >
            <ArrowLeft size={14} />
            Volver a pedidos
          </Link>
          <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
            Pedido #{pedido.numero}
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
            {new Date(pedido.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
            {pedido.fecha_pago && (
              <> · Pago confirmado {new Date(pedido.fecha_pago).toLocaleDateString('es-AR', { day: '2-digit', month: 'long' })}</>
            )}
          </p>
        </div>
        <span className="text-sm px-3 py-1.5 rounded-full shrink-0" style={{ background: col.bg, color: col.text }}>
          {ESTADO_LABEL[pedido.estado] ?? pedido.estado}
        </span>
      </div>

      {/* Acciones de estado */}
      <div className="mb-6">
        <EstadoActions pedidoId={id} estadoActual={pedido.estado} />
      </div>

      {/* Info del cliente */}
      <div className="rounded-xl border p-5 mb-6" style={{ borderColor: 'var(--color-acero-claro)' }}>
        <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--color-acero-oscuro)' }}>
          {esGuest ? 'Comprador no registrado' : 'Cliente'}
        </h2>
        <div className="flex flex-col gap-1">
          <p className="text-base font-medium" style={{ color: 'var(--foreground)' }}>
            {nombreCliente}
            {esGuest && (
              <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: '#f59e0b22', color: '#f59e0b' }}>
                No registrado
              </span>
            )}
          </p>
          {emailCliente && (
            <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>{emailCliente}</p>
          )}
          {telCliente && (
            <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>{telCliente}</p>
          )}
          {cliente?.rol && (
            <p className="text-xs capitalize mt-1" style={{ color: 'var(--color-acero-oscuro)' }}>
              Rol: {cliente.rol.replace('_', ' ')}
            </p>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="rounded-xl border overflow-hidden mb-6" style={{ borderColor: 'var(--color-acero-claro)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--color-granito-oscuro)' }}>
              {['Producto', 'Cant.', 'Precio unit.', 'Subtotal'].map(h => (
                <th key={h} className={`px-4 py-3 font-medium ${h !== 'Producto' ? 'text-right' : 'text-left'}`} style={{ color: 'var(--color-acero-claro)' }}>
                  {h}
                </th>
              ))}
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
                    <span className="font-mono mr-2 text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                      {prod?.codigo_interno}
                    </span>
                    <span style={{ color: 'var(--foreground)' }}>{prod?.titulo}</span>
                    {(item as any).variante && (
                      <span className="block text-xs mt-0.5" style={{ color: 'var(--color-acero-oscuro)' }}>
                        {(item as any).variante}
                      </span>
                    )}
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

      {/* Medio de pago + referencias */}
      {(pedido.medio_pago || pedido.mp_payment_id || pedido.referencia_pago) && (
        <div className="rounded-xl border p-5 mb-6" style={{ borderColor: 'var(--color-acero-claro)' }}>
          <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--color-acero-oscuro)' }}>Pago</h2>
          <div className="flex flex-col gap-1.5 text-sm">
            {pedido.medio_pago && (
              <p style={{ color: 'var(--foreground)' }}>
                <span style={{ color: 'var(--color-acero-oscuro)' }}>Medio: </span>
                <span className="capitalize">{pedido.medio_pago.replace('_', ' ')}</span>
              </p>
            )}
            {pedido.referencia_pago && (
              <p style={{ color: 'var(--foreground)' }}>
                <span style={{ color: 'var(--color-acero-oscuro)' }}>Referencia: </span>
                {pedido.referencia_pago}
              </p>
            )}
            {pedido.mp_payment_id && (
              <p style={{ color: 'var(--foreground)' }}>
                <span style={{ color: 'var(--color-acero-oscuro)' }}>MP Payment ID: </span>
                <span className="font-mono text-xs">{pedido.mp_payment_id}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Notas */}
      {pedido.notas && (
        <div className="rounded-xl border p-5 mb-6" style={{ borderColor: 'var(--color-acero-claro)' }}>
          <h2 className="text-sm font-medium mb-2" style={{ color: 'var(--color-acero-oscuro)' }}>Notas del pedido</h2>
          <p className="text-sm" style={{ color: 'var(--foreground)' }}>{pedido.notas}</p>
        </div>
      )}

      {/* Comprobantes */}
      {comprobantesConUrl.length > 0 && (
        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--color-acero-claro)' }}>
          <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--color-acero-oscuro)' }}>
            Comprobantes de pago
          </h2>
          <div className="flex flex-col gap-2">
            {comprobantesConUrl.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--color-acero-oscuro)' }}>
                  Comprobante {i + 1} · {new Date(c.subido_at).toLocaleDateString('es-AR')}
                </span>
                {c.signedUrl ? (
                  <a
                    href={c.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border text-xs transition-opacity hover:opacity-70"
                    style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}
                  >
                    Ver <ExternalLink size={11} />
                  </a>
                ) : (
                  <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>No disponible</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
