import { createClient } from '@/lib/supabase/server'
import { ShoppingCart, Store } from 'lucide-react'
import Link from 'next/link'

const LABEL_ROL: Record<string, string> = {
  consumidor_final: 'Consumidor Final',
  distribuidor: 'Distribuidor',
  local: 'Local',
  mercha: 'Merchandising',
}

export default async function ClienteDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('nombre, rol, aprobado')
    .eq('id', user!.id)
    .single()

  const { data: pedidos, count } = await supabase
    .from('pedidos')
    .select('id, estado, created_at, total_usd', { count: 'exact' })
    .eq('cliente_id', user!.id)
    .neq('estado', 'borrador')
    .order('created_at', { ascending: false })
    .limit(5)

  if (!profile?.aprobado) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--color-acero-brillo)' }}>
            <Store size={24} strokeWidth={1.5} style={{ color: 'var(--color-acero-oscuro)' }} />
          </div>
          <h2 className="text-xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
            Cuenta pendiente de aprobación
          </h2>
          <p className="text-base" style={{ color: 'var(--color-acero-oscuro)' }}>
            Tu registro fue recibido. Un administrador revisará tu cuenta y te habilitará el acceso al catálogo mayorista en breve.
          </p>
        </div>
      </div>
    )
  }

  const ESTADO_LABEL: Record<string, string> = {
    pendiente_pago: 'Pendiente de pago',
    comprobante_subido: 'Comprobante enviado',
    pago_confirmado: 'Pago confirmado',
    en_preparacion: 'En preparación',
    enviado: 'Enviado',
    entregado: 'Entregado',
    cancelado: 'Cancelado',
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Hola, {profile.nombre ?? 'cliente'}
      </h1>
      <p className="text-base mb-8" style={{ color: 'var(--color-acero-oscuro)' }}>
        Canal: {LABEL_ROL[profile.rol] ?? profile.rol}
      </p>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 gap-4 mb-8 max-w-md">
        <Link
          href="/dashboard/cliente/catalogo"
          className="rounded-xl p-5 border flex flex-col gap-2 transition-colors duration-150"
          style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}
        >
          <Store size={20} strokeWidth={1.5} style={{ color: 'var(--color-granito)' }} />
          <span className="text-base font-medium" style={{ color: 'var(--foreground)' }}>Ver catálogo</span>
          <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Productos disponibles para tu canal</span>
        </Link>
        <Link
          href="/dashboard/cliente/pedidos"
          className="rounded-xl p-5 border flex flex-col gap-2 transition-colors duration-150"
          style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}
        >
          <ShoppingCart size={20} strokeWidth={1.5} style={{ color: 'var(--color-granito)' }} />
          <span className="text-base font-medium" style={{ color: 'var(--foreground)' }}>Mis pedidos</span>
          <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>{count ?? 0} pedidos en total</span>
        </Link>
      </div>

      {/* Últimos pedidos */}
      {pedidos && pedidos.length > 0 && (
        <div>
          <h2 className="text-base font-medium mb-3" style={{ color: 'var(--foreground)' }}>Últimos pedidos</h2>
          <div className="rounded-xl border overflow-hidden max-w-2xl" style={{ borderColor: 'var(--color-acero-claro)' }}>
            {pedidos.map((p, i) => (
              <Link
                key={p.id}
                href={`/dashboard/cliente/pedidos/${p.id}`}
                className="flex items-center justify-between px-5 py-3.5 text-base hover:bg-[var(--color-acero-brillo)] transition-colors duration-150"
                style={{
                  borderBottom: i < pedidos.length - 1 ? '1px solid var(--color-acero-claro)' : 'none',
                  background: 'white',
                }}
              >
                <div>
                  <span className="font-mono text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
                    #{p.id.slice(-8).toUpperCase()}
                  </span>
                  <span className="ml-3 text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
                    {new Date(p.created_at).toLocaleDateString('es-AR')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm px-2 py-0.5 rounded-full" style={{ background: 'var(--color-acero-brillo)', color: 'var(--color-granito-claro)' }}>
                    {ESTADO_LABEL[p.estado] ?? p.estado}
                  </span>
                  {p.total_usd && (
                    <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                      u$s {p.total_usd.toFixed(2)}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
