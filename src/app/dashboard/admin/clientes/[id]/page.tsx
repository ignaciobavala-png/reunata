import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, XCircle, Clock, ShoppingCart } from 'lucide-react'
import { formatPrecio } from '@/lib/utils'
import { estadoLabel, estadoColor } from '@/lib/estadosPedido'

const ESTADO_CREDITO: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string }> = {
  pendiente:  { label: 'En revisión',  icon: <Clock size={13} />,        bg: '#fef9c322', text: '#854d0e' },
  aprobado:   { label: 'Aprobado',     icon: <CheckCircle size={13} />,  bg: '#10b98122', text: '#10b981' },
  rechazado:  { label: 'No aprobado',  icon: <XCircle size={13} />,      bg: '#ef444422', text: '#ef4444' },
  cancelado:  { label: 'Cancelado',    icon: null,                        bg: '#88888822', text: '#888'    },
}

export default async function ClienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const { data: selfProfile } = await authClient.from('profiles').select('rol').eq('id', user.id).single()
  if (!selfProfile || !['master', 'empleado'].includes(selfProfile.rol)) redirect('/dashboard')

  const service = createServiceClient()

  const [{ data: perfil }, { data: pedidos }, { data: creditos }] = await Promise.all([
    service
      .from('profiles')
      .select('id, nombre, email, rol, aprobado, cuit_dni, razon_social, direccion, localidad, sitio_web, puntos_venta, clientes_activos, telefono, ultima_compra_en, created_at, canal_id, canales(nombre, slug)')
      .eq('id', id)
      .single(),
    service
      .from('pedidos')
      .select('id, numero, estado, medio_pago, total_usd, created_at')
      .eq('cliente_id', id)
      .order('created_at', { ascending: false })
      .limit(30),
    service
      .from('solicitudes_credito')
      .select('id, monto, plazo_dias, estado, respuesta, created_at')
      .eq('cliente_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!perfil) notFound()

  const canal = Array.isArray(perfil.canales) ? (perfil.canales[0] ?? null) : perfil.canales
  const esMayorista = ['distribuidor', 'local', 'mercha', 'fabricantes'].includes(perfil.rol)
  const nombrePrincipal = esMayorista && perfil.razon_social ? perfil.razon_social : (perfil.nombre ?? perfil.email ?? '—')
  const creditoActivo = (creditos ?? []).find(c => c.estado === 'aprobado') ?? null

  return (
    <div className="p-8 max-w-4xl">
      {/* Breadcrumb */}
      <Link
        href="/dashboard/admin/clientes"
        className="inline-flex items-center gap-1.5 text-sm mb-6 transition-opacity hover:opacity-70"
        style={{ color: 'var(--color-acero-oscuro)' }}
      >
        <ArrowLeft size={14} />
        Volver a clientes
      </Link>

      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
            {nombrePrincipal}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            {canal && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-acero-brillo)', border: '1px solid var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}>
                {canal.nombre}
              </span>
            )}
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: perfil.aprobado ? '#dcfce7' : '#fef9c3',
                color:      perfil.aprobado ? '#16a34a' : '#854d0e',
              }}
            >
              {perfil.aprobado ? 'Aprobado' : 'Pendiente aprobación'}
            </span>
            {creditoActivo && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#10b98122', color: '#10b981' }}>
                Crédito aprobado
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bloque 1 — Datos del perfil */}
      <section className="rounded-xl border p-5 mb-6" style={{ borderColor: 'var(--color-acero-claro)' }}>
        <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--color-acero-oscuro)' }}>Datos del cliente</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {[
            { label: 'Email',           value: perfil.email },
            { label: 'Teléfono',        value: perfil.telefono },
            { label: 'CUIT / DNI',      value: perfil.cuit_dni },
            { label: 'Rol',             value: perfil.rol?.replace(/_/g, ' ') },
            { label: 'Razón social',    value: perfil.razon_social },
            { label: 'Dirección',       value: [perfil.direccion, perfil.localidad].filter(Boolean).join(', ') || null },
            { label: 'Sitio web',       value: perfil.sitio_web },
            { label: 'Puntos de venta', value: perfil.puntos_venta != null ? String(perfil.puntos_venta) : null },
            { label: 'Clientes activos',value: perfil.clientes_activos != null ? String(perfil.clientes_activos) : null },
            { label: 'Alta en sistema', value: perfil.created_at ? new Date(perfil.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }) : null },
            { label: 'Última compra',   value: perfil.ultima_compra_en ? new Date(perfil.ultima_compra_en).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Sin compras registradas' },
          ].filter(f => f.value).map(f => (
            <div key={f.label}>
              <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-acero-oscuro)' }}>{f.label}</p>
              <p style={{ color: 'var(--foreground)' }}>{f.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bloque 2 — Pedidos */}
      <section className="rounded-xl border overflow-hidden mb-6" style={{ borderColor: 'var(--color-acero-claro)' }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-acero-claro)' }}>
          <h2 className="text-sm font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>
            Pedidos {pedidos?.length ? `(${pedidos.length})` : ''}
          </h2>
        </div>
        {!pedidos?.length ? (
          <div className="px-5 py-10 flex flex-col items-center gap-2" style={{ color: 'var(--color-acero-oscuro)' }}>
            <ShoppingCart size={22} strokeWidth={1.2} className="opacity-30" />
            <p className="text-sm">Sin pedidos registrados</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--color-acero-brillo)' }}>
                {['Nº', 'Estado', 'Medio de pago', 'Total', 'Fecha', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p, i) => {
                const col = estadoColor(p.estado)
                return (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? 'white' : 'var(--color-acero-brillo)', borderTop: '1px solid var(--color-acero-claro)' }}>
                    <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>#{p.numero}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: col.bg, color: col.text }}>
                        {estadoLabel(p.estado)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 capitalize text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                      {p.medio_pago?.replace(/_/g, ' ') ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--foreground)' }}>
                      {p.total_usd != null ? formatPrecio(Number(p.total_usd)) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                      {new Date(p.created_at).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/dashboard/admin/pedidos/${p.id}`}
                        className="text-xs px-2.5 py-1 rounded border transition-opacity hover:opacity-70"
                        style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Bloque 3 — Línea de crédito */}
      <section className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-acero-claro)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-acero-claro)' }}>
          <h2 className="text-sm font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>Línea de crédito</h2>
        </div>
        {!creditos?.length ? (
          <p className="px-5 py-6 text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Sin solicitudes de crédito.</p>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-acero-claro)' }}>
            {creditos.map(c => {
              const cfg = ESTADO_CREDITO[c.estado] ?? ESTADO_CREDITO.cancelado
              return (
                <div key={c.id} className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {c.monto && <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{formatPrecio(c.monto)}</span>}
                      {c.plazo_dias && <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>{c.plazo_dias} días</span>}
                    </div>
                    <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                      {new Date(c.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    {c.respuesta && (
                      <p className="text-xs mt-1" style={{ color: 'var(--color-acero-oscuro)' }}>{c.respuesta}</p>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: cfg.bg, color: cfg.text }}>
                    {cfg.icon}
                    {cfg.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
        <div className="px-5 py-3 border-t" style={{ borderColor: 'var(--color-acero-claro)', background: 'var(--color-acero-brillo)' }}>
          <Link
            href="/dashboard/admin/financiacion"
            className="text-xs transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-acero-oscuro)' }}
          >
            Gestionar desde Financiación →
          </Link>
        </div>
      </section>
    </div>
  )
}
