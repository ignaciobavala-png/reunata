import type { Metadata } from 'next'
import { ExternalLink } from 'lucide-react'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PagoInstrucciones } from './PagoInstrucciones'
import { ComprobanteUploader } from './ComprobanteUploader'
import { VolverAPedirButton } from '../VolverAPedirButton'
import { EditarBorradorButton } from '../EditarBorradorButton'
import { getCuentaSinIvaDelUsuario } from '@/lib/tienda'
import { formatPrecio } from '@/lib/utils'
import { estadoLabel, estadoColor } from '@/lib/estadosPedido'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function DetallePedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/pedidos/${id}`)

  const { data: pedido } = await supabase
    .from('pedidos')
    .select(`
      id, numero, estado, editable, medio_pago, total_usd, costo_envio, envio_descripcion, notas, created_at, expira_en, descuento_nota,
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

  const col = estadoColor(pedido.estado)
  const mostrarInstrucciones = pedido.editable

  // Transferencia sin IVA: los datos son de la cuenta asignada al canal, no del banco oficial
  const cuentaSinIva = mostrarInstrucciones && pedido.medio_pago === 'transferencia_cueva'
    ? await getCuentaSinIvaDelUsuario(user.id)
    : null
  const esBorrador = pedido.estado === 'borrador'

  const expiraEn = (pedido as { expira_en?: string | null }).expira_en
  const diasRestantes = esBorrador && expiraEn
    ? Math.ceil((new Date(expiraEn).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  // Comprobantes del pedido — el service client evita depender de RLS de storage;
  // es seguro porque el select de arriba ya verificó que el pedido es del usuario.
  const service = createServiceClient()
  const { data: comprobantes } = await service
    .from('comprobantes')
    .select('id, url, subido_at')
    .eq('pedido_id', id)
    .order('subido_at', { ascending: false })

  const comprobantesConUrl = await Promise.all(
    (comprobantes ?? []).map(async c => {
      const { data } = await service.storage.from('comprobantes').createSignedUrl(c.url, 3600)
      return { ...c, signedUrl: data?.signedUrl ?? null }
    })
  )

  const waNumber = cfg['whatsapp_numero'] || '5491132720974'
  const waTexto = encodeURIComponent(
    `Hola, acabo de enviar el pedido #${pedido.numero} por ${formatPrecio(Number(pedido.total_usd))}. ¿Pueden confirmarlo?`
  )

  return (
    <main className="pt-36 pb-24 px-6 md:px-16 max-w-2xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
            Pedido #{pedido.numero}
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
            {new Date(pedido.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <span className="text-sm px-3 py-1.5 rounded-full" style={{ background: col.bg, color: col.text }}>
          {estadoLabel(pedido.estado)}
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
                    {formatPrecio(Number(item.precio_unit))}
                  </td>
                  <td className="px-4 py-3 text-right font-medium" style={{ color: 'var(--foreground)' }}>
                    {formatPrecio(Number(item.precio_unit) * item.cantidad)}
                  </td>
                </tr>
              )
            })}
            {(() => {
              const subtotalItems = (pedido.pedido_items ?? []).reduce(
                (acc, i) => acc + Number(i.precio_unit) * i.cantidad, 0
              )
              const costoEnvio = Number(pedido.costo_envio ?? 0)
              const ajusteReal = Math.round(Number(pedido.total_usd) - costoEnvio - subtotalItems)
              const descNota = (pedido as { descuento_nota?: string | null }).descuento_nota
              const esRecargo = ajusteReal > 0
              const hasExtras = ajusteReal !== 0 || costoEnvio > 0
              if (!hasExtras) return null
              const pctTotal = subtotalItems > 0
                ? (Math.abs(ajusteReal) / subtotalItems * 100).toFixed(2).replace('.', ',')
                : null
              const etiquetaAjuste = descNota
                ? `${esRecargo ? 'Recargo' : 'Descuento'} total (${descNota})${pctTotal ? `: ${esRecargo ? '+' : '-'}${pctTotal}%` : ''}`
                : (esRecargo ? 'Recargo' : 'Descuento')
              return (
                <>
                  <tr style={{ borderTop: '1px solid var(--color-acero-claro)', background: 'var(--color-acero-brillo)' }}>
                    <td colSpan={3} className="px-4 py-2 text-right text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
                      Subtotal productos
                    </td>
                    <td className="px-4 py-2 text-right text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
                      {formatPrecio(subtotalItems)}
                    </td>
                  </tr>
                  {ajusteReal !== 0 && (
                    <tr style={{ background: 'var(--color-acero-brillo)' }}>
                      <td colSpan={3} className="px-4 py-2 text-right text-sm" style={{ color: esRecargo ? '#dc2626' : '#16a34a' }}>
                        {etiquetaAjuste}
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-medium" style={{ color: esRecargo ? '#dc2626' : '#16a34a' }}>
                        {esRecargo ? '+' : '-'}{formatPrecio(Math.abs(ajusteReal))}
                      </td>
                    </tr>
                  )}
                  {costoEnvio > 0 && (
                    <tr style={{ background: 'var(--color-acero-brillo)' }}>
                      <td colSpan={3} className="px-4 py-2 text-right text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
                        {pedido.envio_descripcion ? `Envío · ${pedido.envio_descripcion}` : 'Envío'}
                      </td>
                      <td className="px-4 py-2 text-right text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
                        {formatPrecio(costoEnvio)}
                      </td>
                    </tr>
                  )}
                </>
              )
            })()}
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

      {/* Borrador: editar in-place. Otros estados: recargar estos productos como pedido nuevo. */}
      <div className="mb-6">
        {esBorrador
          ? <EditarBorradorButton pedidoId={pedido.id} numero={pedido.numero} />
          : <VolverAPedirButton pedidoId={pedido.id} />}
      </div>

      {esBorrador && (
        <div className="rounded-xl border p-5 flex flex-col gap-4 mb-6" style={{ borderColor: 'var(--color-acero-claro)', background: 'white' }}>
          <div>
            <p className="text-base font-medium mb-1" style={{ color: 'var(--foreground)' }}>
              ¡Tu pedido fue recibido!
            </p>
            <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
              Lo estamos revisando. En breve te contactamos para confirmar disponibilidad, forma de pago y entrega.
            </p>
            {diasRestantes !== null && (
              <p className="text-xs mt-2 px-3 py-1.5 rounded-lg inline-block"
                style={{ background: diasRestantes <= 2 ? '#fee2e2' : '#fff7ed', color: diasRestantes <= 2 ? '#dc2626' : '#92400e' }}>
                {diasRestantes > 0
                  ? `Este borrador vence en ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}. Subí el comprobante para asegurar tu pedido.`
                  : 'Este borrador vence hoy. Subí el comprobante para no perder tu lugar.'}
              </p>
            )}
          </div>
          <div className="h-px" style={{ background: 'var(--color-acero-claro)' }} />
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={`https://wa.me/${waNumber}?text=${waTexto}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: '#25D366', color: 'white' }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Consultar por WhatsApp
            </a>
            <a
              href="/pedidos"
              className="flex items-center justify-center px-5 py-3 rounded-lg text-sm border transition-opacity hover:opacity-70"
              style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}
            >
              Ver mis pedidos
            </a>
          </div>
        </div>
      )}

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

      {comprobantesConUrl.length > 0 && (
        <div className="rounded-xl border p-5 mb-6" style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}>
          <h2 className="text-base font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            Comprobantes enviados
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-acero-oscuro)' }}>
            {comprobantesConUrl.length === 1
              ? 'Recibimos tu comprobante. Lo revisaremos y confirmaremos tu pago en breve.'
              : 'Recibimos tus comprobantes. Los revisaremos y confirmaremos tu pago en breve.'}
          </p>
          <div className="flex flex-col gap-2">
            {comprobantesConUrl.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--color-acero-oscuro)' }}>
                  Comprobante {comprobantesConUrl.length - i} · {new Date(c.subido_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
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

      {['pendiente_pago', 'borrador'].includes(pedido.estado) && (
        <ComprobanteUploader pedidoId={pedido.id} yaHayComprobante={comprobantesConUrl.length > 0} />
      )}
    </main>
  )
}
