import { createClient } from '@/lib/supabase/server'
import { ShoppingCart, Users, Package, RefreshCw } from 'lucide-react'

async function getStats() {
  const supabase = await createClient()
  const [pedidos, clientes, productos, lastSync] = await Promise.all([
    supabase.from('pedidos').select('id, estado', { count: 'exact' }).neq('estado', 'borrador'),
    supabase.from('profiles').select('id', { count: 'exact' }).in('rol', ['consumidor_final','distribuidor','local','mercha']),
    supabase.from('productos').select('id', { count: 'exact' }).eq('activo', true),
    supabase.from('sync_log').select('estado, mensaje, created_at').eq('tipo', 'productos').order('created_at', { ascending: false }).limit(1).single(),
  ])
  const pendientes = await supabase.from('pedidos').select('id', { count: 'exact' }).eq('estado', 'pendiente_pago')
  return {
    totalPedidos: pedidos.count ?? 0,
    pedidosPendientes: pendientes.count ?? 0,
    totalClientes: clientes.count ?? 0,
    totalProductos: productos.count ?? 0,
    lastSync: lastSync.data,
  }
}

export default async function AdminPage() {
  const stats = await getStats()

  const cards = [
    { label: 'Pedidos totales',    value: stats.totalPedidos,     icon: ShoppingCart, sub: `${stats.pedidosPendientes} pendientes de pago` },
    { label: 'Clientes activos',   value: stats.totalClientes,    icon: Users,        sub: 'Registrados en la plataforma' },
    { label: 'Productos activos',  value: stats.totalProductos,   icon: Package,      sub: 'Sincronizados desde Gesu' },
  ]

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Panel de control
      </h1>
      <p className="text-base mb-8" style={{ color: 'var(--color-acero-oscuro)' }}>
        Resumen general del negocio
      </p>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, sub }) => (
          <div
            key={label}
            className="rounded-xl p-6 border"
            style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm tracking-widest uppercase" style={{ color: 'var(--color-acero-oscuro)' }}>
                {label}
              </span>
              <Icon size={16} strokeWidth={1.5} style={{ color: 'var(--color-acero)' }} />
            </div>
            <p className="text-3xl font-medium mb-1" style={{ color: 'var(--foreground)' }}>
              {value}
            </p>
            <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Estado sync */}
      <div
        className="rounded-xl p-5 border flex items-center gap-4"
        style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}
      >
        <RefreshCw size={18} strokeWidth={1.5} style={{ color: 'var(--color-acero-oscuro)' }} />
        <div className="flex-1">
          <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--foreground)' }}>
            Última sincronización con Gesu
          </p>
          <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
            {stats.lastSync
              ? `${stats.lastSync.estado === 'ok' ? '✓' : '✗'} ${stats.lastSync.mensaje} — ${new Date(stats.lastSync.created_at).toLocaleString('es-AR')}`
              : 'Sin sincronizaciones registradas'}
          </p>
        </div>
        <a
          href="/dashboard/admin/sync"
          className="text-sm px-4 py-2 rounded-lg font-medium transition-colors duration-150"
          style={{ background: 'var(--color-granito)', color: 'var(--color-acero-brillo)' }}
        >
          Ir a sync
        </a>
      </div>
    </div>
  )
}
