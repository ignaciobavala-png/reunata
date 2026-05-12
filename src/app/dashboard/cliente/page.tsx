import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ShoppingCart, Store, Tag } from 'lucide-react'
import Link from 'next/link'

const LABEL_ROL: Record<string, string> = {
  consumidor_final: 'Consumidor Final',
  distribuidor: 'Distribuidor',
  local: 'Local',
  mercha: 'Merchandising',
}

const CANAL_COLOR: Record<string, string> = {
  consumidor_final: '#6366f1',
  distribuidor:     '#0ea5e9',
  local:            '#10b981',
  mercha:           '#f59e0b',
}

const LISTA_LABEL: Record<string, string> = {
  precio_lista1: 'Lista 1',
  precio_lista2: 'Lista 2',
  precio_lista3: 'Lista 3',
  precio_lista4: 'Lista 4',
  precio_lista5: 'Lista 5',
}

const ESTADO_LABEL: Record<string, string> = {
  pendiente_pago:     'Pendiente de pago',
  comprobante_subido: 'Comprobante enviado',
  pago_confirmado:    'Pago confirmado',
  en_preparacion:     'En preparación',
  enviado:            'Enviado',
  entregado:          'Entregado',
  cancelado:          'Cancelado',
}

export default async function ClienteDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nombre, rol, aprobado, canal_id, razon_social')
    .eq('id', user.id)
    .single()

  const [pedidosRes, canalRes] = await Promise.all([
    supabase
      .from('pedidos')
      .select('id, estado, created_at, total_usd', { count: 'exact' })
      .eq('cliente_id', user.id)
      .neq('estado', 'borrador')
      .order('created_at', { ascending: false })
      .limit(5),
    profile?.canal_id
      ? supabase.from('canales').select('nombre, descripcion, lista_precios').eq('id', profile.canal_id).single()
      : Promise.resolve({ data: null }),
  ])

  const pedidos = pedidosRes.data
  const count = pedidosRes.count
  const canal = canalRes.data as { nombre: string; descripcion: string | null; lista_precios: string | null } | null

  const esMayorista = ['distribuidor', 'local', 'mercha'].includes(profile?.rol ?? '')
  const color = CANAL_COLOR[profile?.rol ?? ''] ?? '#6366f1'
  const nombreMostrado = esMayorista && profile?.razon_social
    ? profile.razon_social
    : (profile?.nombre ?? 'cliente')

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
            {esMayorista
              ? 'Tu cuenta está siendo revisada por nuestro equipo comercial. Te contactaremos a la brevedad para coordinar los primeros pasos.'
              : 'Tu registro fue recibido. En breve habilitaremos tu acceso al catálogo.'
            }
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1 flex-wrap">
        <h1 className="text-2xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
          Hola, {nombreMostrado}
        </h1>
        <span
          className="text-xs px-2.5 py-1 rounded-full font-medium"
          style={{ background: `${color}22`, color }}
        >
          {LABEL_ROL[profile?.rol ?? ''] ?? profile?.rol}
        </span>
      </div>

      {/* Panel de canal — solo mayoristas */}
      {esMayorista && canal ? (
        <div
          className="mt-4 mb-8 rounded-xl border p-5 flex flex-col gap-1 max-w-lg"
          style={{ borderColor: `${color}44`, background: `${color}0a` }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Tag size={14} style={{ color }} />
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color }}>
              Condiciones del canal
            </span>
          </div>
          <p className="text-base font-medium" style={{ color: 'var(--foreground)' }}>{canal.nombre}</p>
          {canal.descripcion && (
            <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>{canal.descripcion}</p>
          )}
          {canal.lista_precios && (
            <p className="text-sm mt-1" style={{ color: 'var(--color-granito-claro)' }}>
              Lista de precios activa:{' '}
              <strong>{LISTA_LABEL[canal.lista_precios] ?? canal.lista_precios}</strong>
            </p>
          )}
        </div>
      ) : (
        <p className="text-base mb-8" style={{ color: 'var(--color-acero-oscuro)' }}>
          Bienvenido a tu espacio de compras.
        </p>
      )}

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 gap-4 mb-8 max-w-md">
        <Link
          href="/dashboard/cliente/catalogo"
          className="rounded-xl p-5 border flex flex-col gap-2 transition-colors duration-150"
          style={{ background: 'white', borderColor: 'var(--color-acero-claro)' }}
        >
          <Store size={20} strokeWidth={1.5} style={{ color: 'var(--color-granito)' }} />
          <span className="text-base font-medium" style={{ color: 'var(--foreground)' }}>Ver catálogo</span>
          <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
            {esMayorista ? 'Productos y precios de tu canal' : 'Explorar productos disponibles'}
          </span>
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
