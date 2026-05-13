'use client'

import { useState, useMemo } from 'react'
import { useCartStore } from '@/stores/cartStore'
import { Search, ShoppingCart, Check } from 'lucide-react'

interface Producto {
  id: number
  codigo_interno: string
  titulo: string
  categoria: string | null
  stock: number | null
  precio: number
}

export function CatalogoClient({ productos, categorias, tipoCliente }: { productos: Producto[]; categorias: string[]; tipoCliente: 'mayorista' | 'minorista' }) {
  const { add, items } = useCartStore()
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('')
  const [agregados, setAgregados] = useState<Set<number>>(new Set())

  const filtrados = useMemo(() => {
    return productos.filter(p => {
      const q = busqueda.toLowerCase()
      const matchQ = !busqueda ||
        p.titulo.toLowerCase().includes(q) ||
        p.codigo_interno.toLowerCase().includes(q)
      const matchCat = !categoria || p.categoria === categoria
      return matchQ && matchCat
    })
  }, [productos, busqueda, categoria])

  const porCategoria = useMemo(() => {
    const grupos: Record<string, Producto[]> = {}
    for (const p of filtrados) {
      const cat = p.categoria ?? 'Sin categoría'
      if (!grupos[cat]) grupos[cat] = []
      grupos[cat].push(p)
    }
    return grupos
  }, [filtrados])

  function handleAgregar(p: Producto) {
    add({ productoId: p.id, codigo_interno: p.codigo_interno, titulo: p.titulo, precio: p.precio })
    setAgregados(prev => new Set(prev).add(p.id))
    setTimeout(() => setAgregados(prev => { const s = new Set(prev); s.delete(p.id); return s }), 1500)
  }

  const enCarrito = (id: number) => items.some(i => i.productoId === id)

  return (
    <div>
      {/* Filtros */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-acero)' }} />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar producto o código…"
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border outline-none"
            style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
          />
        </div>
        <select
          value={categoria}
          onChange={e => setCategoria(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border outline-none"
          style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
        >
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-sm self-center" style={{ color: 'var(--color-acero-oscuro)' }}>
          {filtrados.length} productos
        </span>
      </div>

      {/* Tabla por categoría */}
      {Object.keys(porCategoria).sort().map(cat => (
        <div key={cat} className="mb-8">
          <h2
            className="text-sm font-medium tracking-widest uppercase mb-3 pb-2 border-b"
            style={{ color: 'var(--color-granito-claro)', borderColor: 'var(--color-acero-claro)' }}
          >
            {cat} <span style={{ color: 'var(--color-acero)' }}>({porCategoria[cat].length})</span>
          </h2>

          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-acero-claro)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--color-acero-brillo)' }}>
                  <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>Código</th>
                  <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>Producto</th>
                  <th className="text-right px-4 py-2.5 font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>Stock</th>
                  <th className="text-right px-4 py-2.5 font-medium" style={{ color: 'var(--color-acero-oscuro)' }}>Precio</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {porCategoria[cat].map((p, i) => {
                  const agregado = agregados.has(p.id)
                  const yaEsta = enCarrito(p.id)
                  return (
                    <tr
                      key={p.id}
                      style={{
                        background: i % 2 === 0 ? 'white' : 'var(--color-acero-brillo)',
                        borderTop: '1px solid var(--color-acero-claro)',
                      }}
                    >
                      <td className="px-4 py-3 font-mono" style={{ color: 'var(--color-acero-oscuro)' }}>
                        {p.codigo_interno}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--foreground)' }}>
                        {p.titulo}
                      </td>
                      <td className="px-4 py-3 text-right" style={{ color: p.stock === 0 ? '#ef4444' : 'var(--color-acero-oscuro)' }}>
                        {p.stock ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium" style={{ color: 'var(--foreground)' }}>
                        u$s {p.precio.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleAgregar(p)}
                          disabled={p.stock === 0}
                          className="p-1.5 rounded-lg border transition-all duration-150 disabled:opacity-30"
                          style={{
                            borderColor: agregado || yaEsta ? '#10b981' : 'var(--color-acero-claro)',
                            background: agregado || yaEsta ? '#10b98115' : 'transparent',
                            color: agregado || yaEsta ? '#10b981' : 'var(--color-acero-oscuro)',
                          }}
                          title={p.stock === 0 ? 'Sin stock' : tipoCliente === 'mayorista' ? 'Agregar al pedido' : 'Agregar al carrito'}
                        >
                          {agregado ? <Check size={13} /> : <ShoppingCart size={13} />}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {filtrados.length === 0 && (
        <div className="text-center py-16 text-base" style={{ color: 'var(--color-acero-oscuro)' }}>
          No se encontraron productos.
        </div>
      )}
    </div>
  )
}
