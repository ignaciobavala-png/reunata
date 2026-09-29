'use client'

import { useMemo, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { ProductGridPublic } from '@/components/sections/ProductGridPublic'

export type ArriboFiltro = { id: string; label: string }

type ProductoContainers = React.ComponentProps<typeof ProductGridPublic>['productos'][number] & {
  /** Ids de los viajes (containers) que traen este producto. */
  viajes: string[]
}

/**
 * Grilla de REUNATA importa con filtro por viaje.
 *
 * Pedido del tester (29/09/2026): el sidebar de filtros estaba vacío y "solamente
 * con meter el filtro de cada contenedor ya va a estar bien" — Arribo Octubre,
 * Arribo Diciembre. Por eso no trae los filtros de /tienda/todos (color, precio,
 * ficha técnica): el mismo marco visual, una sola faceta.
 */
export function ContainersClient({
  productos,
  arribos,
  mostrarPrecios,
  esMayorista,
  estaLogueado,
}: {
  productos: ProductoContainers[]
  arribos: ArriboFiltro[]
  mostrarPrecios: boolean
  esMayorista: boolean
  estaLogueado: boolean
}) {
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [filtersOpen, setFiltersOpen] = useState(false)

  const conteo = useMemo(() => {
    const c = new Map<string, number>()
    productos.forEach(p => p.viajes.forEach(v => c.set(v, (c.get(v) ?? 0) + 1)))
    return c
  }, [productos])

  const resultado = useMemo(
    () => seleccion.size === 0 ? productos : productos.filter(p => p.viajes.some(v => seleccion.has(v))),
    [productos, seleccion],
  )

  const hayFiltros = seleccion.size > 0

  function toggle(id: string) {
    setSeleccion(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const panelFiltros = (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[10px] tracking-[0.25em] uppercase mb-3" style={{ color: 'var(--color-acero-oscuro)' }}>
          Contenedor
        </p>
        {arribos.map(a => (
          <label key={a.id} className="flex items-center gap-2 py-1 cursor-pointer">
            <input
              type="checkbox"
              checked={seleccion.has(a.id)}
              onChange={() => toggle(a.id)}
              className="accent-[var(--color-granito)]"
            />
            <span className="text-xs" style={{ color: 'var(--foreground)' }}>
              {a.label} <span style={{ color: 'var(--color-acero-oscuro)' }}>({conteo.get(a.id) ?? 0})</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  )

  const cantidad = `${resultado.length} producto${resultado.length !== 1 ? 's' : ''}`

  return (
    <div>
      {/* Mobile: botón filtrar */}
      <div className="flex items-center justify-between mb-6 md:hidden">
        <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>{cantidad}</p>
        <button
          onClick={() => setFiltersOpen(v => !v)}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border"
          style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
        >
          <SlidersHorizontal size={12} />
          Filtrar
          {hayFiltros && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-granito)]" />}
        </button>
      </div>

      {filtersOpen && (
        <div className="md:hidden mb-6 p-4 rounded-xl border" style={{ borderColor: 'var(--color-acero-claro)' }}>
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>Filtros</span>
            <button onClick={() => setFiltersOpen(false)} aria-label="Cerrar filtros">
              <X size={14} style={{ color: 'var(--color-acero-oscuro)' }} />
            </button>
          </div>
          {panelFiltros}
        </div>
      )}

      <div className="md:flex md:gap-12">
        <aside className="hidden md:block flex-shrink-0 w-52">
          <div className="sticky top-28">
            <div className="flex items-center justify-between mb-5">
              <span className="text-xs font-medium tracking-wide" style={{ color: 'var(--foreground)' }}>
                Filtros
              </span>
              {hayFiltros && (
                <button
                  onClick={() => setSeleccion(new Set())}
                  className="text-[10px] underline"
                  style={{ color: 'var(--color-acero-oscuro)' }}
                >
                  Limpiar
                </button>
              )}
            </div>
            {panelFiltros}
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <p className="hidden md:block text-sm mb-6" style={{ color: 'var(--color-acero-oscuro)' }}>{cantidad}</p>
          <ProductGridPublic
            productos={resultado}
            nombreCategoria="REUNATA importa"
            mostrarPrecios={mostrarPrecios}
            estaLogueado={estaLogueado}
            esMayorista={esMayorista}
          />
        </div>
      </div>
    </div>
  )
}
