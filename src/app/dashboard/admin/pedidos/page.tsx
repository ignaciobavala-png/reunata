import { createClient } from '@/lib/supabase/server'
import { ShoppingCart, Search } from 'lucide-react'
import { formatPrecio } from '@/lib/utils'
import Link from 'next/link'

const PAGE_SIZE = 30

const LABEL_ESTADO: Record<string, string> = {
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

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string; page?: string }>
}) {
  const { estado, q: rawQ, page: rawPage } = await searchParams
  const q    = rawQ?.trim() ?? ''
  const page = Math.max(1, parseInt(rawPage ?? '1'))
  const supabase = await createClient()

  // Buscar IDs de clientes que coincidan con el término (para pedidos registrados)
  let matchingClienteIds: string[] = []
  if (q && !/^\d+$/.test(q)) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .or(`nombre.ilike.%${q}%,email.ilike.%${q}%`)
    matchingClienteIds = (profiles ?? []).map(p => p.id)
  }

  // Query principal con count
  let query = supabase
    .from('pedidos')
    .select(`
      id, numero, estado, medio_pago, total_usd, created_at, cliente_id,
      guest_nombre, guest_email,
      cliente:cliente_id ( nombre, email )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (estado) query = query.eq('estado', estado)

  if (q) {
    if (/^\d+$/.test(q)) {
      query = query.eq('numero', parseInt(q))
    } else {
      let orFilter = `guest_nombre.ilike.%${q}%,guest_email.ilike.%${q}%`
      if (matchingClienteIds.length > 0) {
        orFilter += `,cliente_id.in.(${matchingClienteIds.join(',')})`
      }
      query = query.or(orFilter)
    }
  }

  const { data: pedidos, count } = await query
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  // Construye URL preservando todos los filtros activos
  function url(overrides: Record<string, string | undefined>) {
    const merged: Record<string, string | undefined> = {
      estado: estado || undefined,
      q: q || undefined,
      page: page !== 1 ? String(page) : undefined,
      ...overrides,
    }
    const p = new URLSearchParams()
    Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v) })
    const qs = p.toString()
    return `/dashboard/admin/pedidos${qs ? `?${qs}` : ''}`
  }

  const estadosList = Object.keys(LABEL_ESTADO)

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Pedidos
      </h1>
      <p className="text-base mb-6" style={{ color: 'var(--color-acero-oscuro)' }}>
        Seguimiento y gestión de todos los pedidos de clientes.
      </p>

      {/* Búsqueda */}
      <form method="GET" action="/dashboard/admin/pedidos" className="mb-5">
        {estado && <input type="hidden" name="estado" value={estado} />}
        <div className="flex gap-2 max-w-md">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-acero-oscuro)' }} />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Buscar por nº de pedido, nombre o email…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none"
              style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)', background: 'white' }}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-sm rounded-lg font-medium"
            style={{ background: 'var(--color-granito-oscuro)', color: 'white' }}
          >
            Buscar
          </button>
          {q && (
            <a
              href={url({ q: undefined, page: undefined })}
              className="px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}
            >
              ✕
            </a>
          )}
        </div>
      </form>

      {/* Filtro de estados */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <a
          href={url({ estado: undefined, page: undefined })}
          className="px-3 py-1.5 rounded-lg text-sm border transition-colors duration-150"
          style={{
            borderColor: !estado ? 'var(--color-granito)' : 'var(--color-acero-claro)',
            background:  !estado ? 'var(--color-granito)' : 'white',
            color:       !estado ? 'var(--color-acero-brillo)' : 'var(--color-acero-oscuro)',
          }}
        >
          Todos
        </a>
        {estadosList.map(e => (
          <a
            key={e}
            href={url({ estado: e, page: undefined })}
            className="px-3 py-1.5 rounded-lg text-sm border transition-colors duration-150"
            style={{
              borderColor: estado === e ? COLOR_ESTADO[e].text : 'var(--color-acero-claro)',
              background:  estado === e ? COLOR_ESTADO[e].bg  : 'white',
              color:       estado === e ? COLOR_ESTADO[e].text : 'var(--color-acero-oscuro)',
            }}
          >
            {LABEL_ESTADO[e]}
          </a>
        ))}
      </div>

      {/* Tabla */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-acero-claro)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--color-granito-oscuro)' }}>
                {['Nº Pedido', 'Cliente', 'Estado', 'Medio de pago', 'Total', 'Fecha', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-acero-claro)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(pedidos ?? []).map((p, i) => {
                const col = COLOR_ESTADO[p.estado] ?? { bg: '#88888822', text: '#888888' }
                const cliente = p.cliente as { nombre?: string; email?: string } | null
                const nombreMostrado = cliente?.nombre || (p as any).guest_nombre || '—'
                const emailMostrado  = cliente?.email  || (p as any).guest_email  || ''
                const esGuest = !cliente && !!(p as any).guest_email
                return (
                  <tr
                    key={p.id}
                    style={{
                      background: i % 2 === 0 ? 'white' : 'var(--color-acero-brillo)',
                      borderBottom: '1px solid var(--color-acero-claro)',
                    }}
                  >
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--color-acero-oscuro)' }}>
                      #{p.numero}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {!esGuest && p.cliente_id ? (
                          <Link
                            href={`/dashboard/admin/clientes/${p.cliente_id}`}
                            className="font-medium hover:underline"
                            style={{ color: 'var(--foreground)' }}
                          >
                            {nombreMostrado}
                          </Link>
                        ) : (
                          <p style={{ color: 'var(--foreground)' }}>{nombreMostrado}</p>
                        )}
                        {esGuest && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#f59e0b22', color: '#f59e0b' }}>
                            No registrado
                          </span>
                        )}
                      </div>
                      {emailMostrado && <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>{emailMostrado}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: col.bg, color: col.text }}>
                        {LABEL_ESTADO[p.estado] ?? p.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                      {p.medio_pago?.replace(/_/g, ' ') ?? '—'}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--foreground)' }}>
                      {p.total_usd != null ? formatPrecio(Number(p.total_usd)) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                      {new Date(p.created_at).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/admin/pedidos/${p.id}`}
                        className="text-xs px-3 py-1.5 rounded-lg border transition-opacity hover:opacity-70"
                        style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}
                      >
                        Ver / Gestionar
                      </Link>
                    </td>
                  </tr>
                )
              })}

              {(pedidos ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center" style={{ color: 'var(--color-acero-oscuro)' }}>
                    <ShoppingCart size={24} strokeWidth={1.2} className="mx-auto mb-3 opacity-30" />
                    {q
                      ? `Sin resultados para "${q}"${estado ? ` con estado "${LABEL_ESTADO[estado]}"` : ''}.`
                      : `No hay pedidos${estado ? ` con estado "${LABEL_ESTADO[estado]}"` : ' registrados todavía'}.`
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
            {count} pedidos · página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={url({ page: page > 2 ? String(page - 1) : undefined })}
                className="px-3 py-1.5 text-sm rounded-lg border transition-opacity hover:opacity-70"
                style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}
              >
                ← Anterior
              </a>
            )}
            {page < totalPages && (
              <a
                href={url({ page: String(page + 1) })}
                className="px-3 py-1.5 text-sm rounded-lg border transition-opacity hover:opacity-70"
                style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--color-acero-oscuro)' }}
              >
                Siguiente →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
