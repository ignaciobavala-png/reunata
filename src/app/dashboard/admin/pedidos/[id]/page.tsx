import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { formatPrecio } from '@/lib/utils'
import { EstadoActions } from './EstadoActions'
import { PrintButton } from './PrintButton'
import { GenerarEnvioButton } from './GenerarEnvioButton'
import { estadoLabel, estadoColor } from '@/lib/estadosPedido'

export default async function AdminDetallePedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const service = createServiceClient()

  const { data: pedido } = await supabase
    .from('pedidos')
    .select(`
      id, numero, estado, medio_pago, referencia_pago, total_usd, costo_envio, envio_descripcion,
      descuento_sugerido, descuento_nota,
      envio_calle, envio_numero, envio_piso, envio_codigo_postal, envio_provincia,
      envio_servicio, enviopack_envio_id, enviopack_estado, tracking, metodo_envio,
      notas, created_at, fecha_pago, mp_preference_id, mp_payment_id,
      cliente_id, guest_nombre, guest_email, guest_telefono,
      pedido_items (
        id, cantidad, precio_unit, variante,
        producto:producto_id ( id, codigo_interno, titulo )
      ),
      cliente:cliente_id ( nombre, razon_social, email, telefono, rol, cuit_dni, direccion, localidad, sitio_web, puntos_venta )
    `)
    .eq('id', id)
    .single()

  if (!pedido) notFound()

  const { data: comprobantes } = await service
    .from('comprobantes')
    .select('id, url, subido_at')
    .eq('pedido_id', id)
    .order('subido_at', { ascending: false })

  const { data: historialEstados } = await service
    .from('pedido_estado_historial')
    .select('id, estado_anterior, estado_nuevo, created_at, usuario:usuario_id ( nombre, email )')
    .eq('pedido_id', id)
    .order('created_at', { ascending: false })

  // Generar signed URLs para comprobantes (bucket comprobantes, 1h)
  const comprobantesConUrl = await Promise.all(
    (comprobantes ?? []).map(async c => {
      const { data } = await service.storage.from('comprobantes').createSignedUrl(c.url, 3600)
      return { ...c, signedUrl: data?.signedUrl ?? null }
    })
  )

  const col = estadoColor(pedido.estado)
  const cliente = pedido.cliente as {
    nombre?: string; razon_social?: string; email?: string; telefono?: string; rol?: string
    cuit_dni?: string; direccion?: string; localidad?: string; sitio_web?: string; puntos_venta?: number
  } | null
  const esGuest = !cliente

  const nombreCliente = cliente?.nombre ?? (pedido as any).guest_nombre ?? '—'
  const emailCliente  = cliente?.email  ?? (pedido as any).guest_email  ?? ''
  const telCliente    = cliente?.telefono ?? (pedido as any).guest_telefono ?? ''
  const esMayorista = ['distribuidor', 'local', 'mercha'].includes(cliente?.rol ?? '')

  return (
    <div className="p-8 max-w-3xl">
      {/* Back + header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link
            href="/dashboard/admin/pedidos"
            className="print:hidden inline-flex items-center gap-1.5 text-sm mb-3 transition-opacity hover:opacity-70"
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
        <div className="flex items-center gap-3">
          <PrintButton />
          <span className="text-sm px-3 py-1.5 rounded-full shrink-0" style={{ background: col.bg, color: col.text }}>
            {estadoLabel(pedido.estado)}
          </span>
        </div>
      </div>

      {/* Acciones de estado */}
      <div className="print:hidden mb-6">
        <EstadoActions pedidoId={id} estadoActual={pedido.estado} medioPago={pedido.medio_pago} />
      </div>

      {/* Info del cliente */}
      <div className="rounded-xl border p-5 mb-6" style={{ borderColor: 'var(--color-acero-claro)' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>
            {esGuest ? 'Comprador no registrado' : 'Cliente'}
          </h2>
          {!esGuest && pedido.cliente_id && (
            <Link
              href={`/dashboard/admin/clientes/${pedido.cliente_id}`}
              className="text-xs transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-acero-oscuro)' }}
            >
              Ver perfil completo →
            </Link>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-base font-medium" style={{ color: 'var(--foreground)' }}>
            {esMayorista && cliente?.razon_social ? cliente.razon_social : nombreCliente}
            {esGuest && (
              <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: '#f59e0b22', color: '#f59e0b' }}>
                No registrado
              </span>
            )}
          </p>
          {esMayorista && cliente?.razon_social && (
            <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Contacto: {nombreCliente}</p>
          )}
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
          {esMayorista && (cliente?.cuit_dni || cliente?.direccion || cliente?.localidad || cliente?.sitio_web || cliente?.puntos_venta != null) && (
            <div className="mt-2 pt-2 flex flex-col gap-0.5" style={{ borderTop: '1px solid var(--color-acero-claro)' }}>
              {cliente?.cuit_dni && (
                <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>CUIT/DNI: {cliente.cuit_dni}</p>
              )}
              {(cliente?.direccion || cliente?.localidad) && (
                <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                  {[cliente?.direccion, cliente?.localidad].filter(Boolean).join(', ')}
                </p>
              )}
              {cliente?.sitio_web && (
                <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>{cliente.sitio_web}</p>
              )}
              {cliente?.puntos_venta != null && (
                <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>Puntos de venta: {cliente.puntos_venta}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="pedido-items rounded-xl border overflow-hidden mb-6" style={{ borderColor: 'var(--color-acero-claro)' }}>
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

            {(() => {
              const subtotalItems = (pedido.pedido_items ?? []).reduce(
                (acc, i) => acc + Number(i.precio_unit) * i.cantidad, 0
              )
              const costoEnvio = Number(pedido.costo_envio ?? 0)
              // Ajuste real derivado de los números guardados — cubre autogestión,
              // método de pago y cualquier combinación. Negativo = descuento, positivo = recargo.
              const ajusteReal = Math.round(Number(pedido.total_usd) - costoEnvio - subtotalItems)
              const descNota = (pedido as any).descuento_nota as string | null
              const hasExtras = ajusteReal !== 0 || costoEnvio > 0
              const esRecargo = ajusteReal > 0
              const pctTotal = subtotalItems > 0
                ? (Math.abs(ajusteReal) / subtotalItems * 100).toFixed(2).replace('.', ',')
                : null
              const etiquetaAjuste = descNota
                ? `${esRecargo ? 'Recargo' : 'Descuento'} total (${descNota})${pctTotal ? `: ${esRecargo ? '+' : '-'}${pctTotal}%` : ''}`
                : (esRecargo ? 'Recargo' : 'Descuento')
              return hasExtras ? (
                <>
                  <tr style={{ borderTop: '1px solid var(--color-acero-claro)', background: 'var(--color-acero-brillo)' }}>
                    <td colSpan={3} className="px-4 py-2 text-right text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
                      Subtotal
                    </td>
                    <td className="px-4 py-2 text-right text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
                      {formatPrecio(subtotalItems)}
                    </td>
                  </tr>
                  {ajusteReal !== 0 && (
                    <tr style={{ background: 'var(--color-acero-brillo)' }}>
                      <td colSpan={3} className="px-4 py-2 text-right text-sm" style={{ color: esRecargo ? '#dc2626' : '#10b981' }}>
                        {etiquetaAjuste}
                      </td>
                      <td className="px-4 py-2 text-right text-sm" style={{ color: esRecargo ? '#dc2626' : '#10b981' }}>
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
              ) : null
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

      {/* Envío */}
      {((pedido as any).envio_descripcion || (pedido as any).envio_calle) && (
        <div className="pedido-envio rounded-xl border p-5 mb-6" style={{ borderColor: 'var(--color-acero-claro)' }}>
          <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--color-acero-oscuro)' }}>Envío</h2>
          <div className="flex flex-col gap-1.5 text-sm">
            {(pedido as any).envio_descripcion && (
              <p style={{ color: 'var(--foreground)' }}>
                <span style={{ color: 'var(--color-acero-oscuro)' }}>Servicio: </span>
                {(pedido as any).envio_descripcion}
              </p>
            )}
            {(pedido as any).envio_calle && (
              <p style={{ color: 'var(--foreground)' }}>
                <span style={{ color: 'var(--color-acero-oscuro)' }}>Dirección: </span>
                {[
                  `${(pedido as any).envio_calle} ${(pedido as any).envio_numero ?? ''}`.trim(),
                  (pedido as any).envio_piso,
                ].filter(Boolean).join(', ')}
              </p>
            )}
            {((pedido as any).envio_codigo_postal || (pedido as any).envio_provincia) && (
              <p style={{ color: 'var(--foreground)' }}>
                <span style={{ color: 'var(--color-acero-oscuro)' }}>CP / Provincia: </span>
                {[(pedido as any).envio_codigo_postal, (pedido as any).envio_provincia].filter(Boolean).join(' · ')}
              </p>
            )}
            {(pedido.costo_envio ?? 0) > 0 && (
              <p style={{ color: 'var(--foreground)' }}>
                <span style={{ color: 'var(--color-acero-oscuro)' }}>Costo: </span>
                {formatPrecio(Number(pedido.costo_envio))}
              </p>
            )}
          </div>
          {/* Enviopack: generar envío (solo con dirección a domicilio cargada) */}
          {(pedido as any).envio_calle && (
            <div className="print:hidden mt-4 pt-4" style={{ borderTop: '1px solid var(--color-acero-claro)' }}>
              <GenerarEnvioButton
                pedidoId={pedido.id}
                envioId={(pedido as any).enviopack_envio_id ?? null}
                estado={(pedido as any).enviopack_estado ?? null}
                tracking={(pedido as any).tracking ?? null}
                metodoEnvio={(pedido as any).metodo_envio ?? null}
              />
            </div>
          )}
        </div>
      )}

      {/* Medio de pago + referencias */}
      {(pedido.medio_pago || pedido.mp_payment_id || pedido.referencia_pago) && (
        <div className="pedido-pago rounded-xl border p-5 mb-6" style={{ borderColor: 'var(--color-acero-claro)' }}>
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

      {/* Comprobantes — ocultos en impresión */}
      {comprobantesConUrl.length > 0 && (
        <div className="print:hidden rounded-xl border p-5" style={{ borderColor: 'var(--color-acero-claro)' }}>
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

      {/* Historial de estados — oculto en impresión */}
      {(historialEstados?.length ?? 0) > 0 && (
        <div className="print:hidden rounded-xl border p-5 mb-6" style={{ borderColor: 'var(--color-acero-claro)' }}>
          <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--color-acero-oscuro)' }}>
            Historial de estados
          </h2>
          <div className="flex flex-col gap-2">
            {historialEstados!.map(h => {
              const usuario = h.usuario as unknown as { nombre?: string; email?: string } | null
              return (
                <div key={h.id} className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--foreground)' }}>
                    {h.estado_anterior ? `${estadoLabel(h.estado_anterior)} → ` : ''}
                    {estadoLabel(h.estado_nuevo)}
                    {usuario && (
                      <span className="text-xs ml-2" style={{ color: 'var(--color-acero-oscuro)' }}>
                        {usuario.nombre ?? usuario.email}
                      </span>
                    )}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                    {new Date(h.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {' · '}
                    {new Date(h.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pie solo visible al imprimir */}
      <div className="hidden print:block mt-10 pt-6 text-xs" style={{ borderTop: '1px solid #ccc', color: '#888' }}>
        <p>Reunata · Pedido #{pedido.numero} · Impreso el {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
      </div>
    </div>
  )
}
