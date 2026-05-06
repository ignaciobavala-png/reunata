'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Loader2, Plus, ChevronDown } from 'lucide-react'
import { agregarOferta, eliminarOferta, actualizarOferta } from '@/app/actions/ofertas'
import Image from 'next/image'

interface ProductoItem {
  id: number
  codigo_interno: string | null
  titulo: string
  precio_lista1: number | null
  categoria: string | null
}

interface OfertaItem {
  id: number
  canal: string
  producto_id: number
  precio_oferta: number
  descuento_porcentaje: number
  orden: number
  activo: boolean
  producto: ProductoItem | null
}

export function OfertasClient({
  productos,
  fotoMap,
  ofertas: ofertasIniciales,
}: {
  productos: ProductoItem[]
  fotoMap: Record<string, string>
  ofertas: OfertaItem[]
}) {
  const router = useRouter()
  const [canal, setCanal] = useState<'ofertas' | 'hotsale'>('ofertas')
  const [ofertas, setOfertas] = useState<OfertaItem[]>(ofertasIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [busquedaModal, setBusquedaModal] = useState('')
  const [guardando, setGuardando] = useState<number | null>(null)
  const [editando, setEditando] = useState<Record<number, { precio_oferta?: string; descuento?: string; orden?: string }>>({})
  const [agregando, setAgregando] = useState(false)

  const ofertasFiltradas = useMemo(
    () => ofertas.filter(o => o.canal === canal).sort((a, b) => a.orden - b.orden),
    [ofertas, canal]
  )

  const idsEnCanal = useMemo(
    () => new Set(ofertasFiltradas.map(o => o.producto_id)),
    [ofertasFiltradas]
  )

  const productosDisponibles = useMemo(
    () => productos
      .filter(p => !idsEnCanal.has(p.id))
      .filter(p => {
        if (!busquedaModal) return true
        const q = busquedaModal.toLowerCase()
        return (
          p.titulo.toLowerCase().includes(q) ||
          (p.codigo_interno ?? '').toLowerCase().includes(q)
        )
      }),
    [productos, idsEnCanal, busquedaModal]
  )

  async function handleAgregar(productoId: number) {
    const producto = productos.find(p => p.id === productoId)
    if (!producto) return
    const precioLista = producto.precio_lista1 ?? 0
    const descuento = 10
    const precioOferta = +(precioLista * (1 - descuento / 100)).toFixed(2)

    setAgregando(true)
    try {
      await agregarOferta(canal, productoId, precioOferta, descuento)
      const ofertaNueva: OfertaItem = {
        id: Date.now(),
        canal,
        producto_id: productoId,
        precio_oferta: precioOferta,
        descuento_porcentaje: descuento,
        orden: ofertasFiltradas.length,
        activo: true,
        producto,
      }
      setOfertas(prev => [...prev, ofertaNueva])
      router.refresh()
    } catch (e) {
      console.error(e)
    } finally {
      setAgregando(false)
      setModalAbierto(false)
    }
  }

  async function handleEliminar(id: number) {
    const anterior = ofertas
    setOfertas(prev => prev.filter(o => o.id !== id))
    try {
      await eliminarOferta(id)
      router.refresh()
    } catch {
      setOfertas(anterior)
    }
  }

  function initEdit(oferta: OfertaItem) {
    setEditando(prev => ({
      ...prev,
      [oferta.id]: {
        precio_oferta: String(oferta.precio_oferta),
        descuento: String(oferta.descuento_porcentaje),
        orden: String(oferta.orden),
      },
    }))
  }

  async function saveEdit(id: number) {
    const vals = editando[id]
    if (!vals) return
    const data: Record<string, unknown> = {}
    if (vals.precio_oferta) data.precio_oferta = parseFloat(vals.precio_oferta)
    if (vals.descuento) data.descuento_porcentaje = parseInt(vals.descuento)
    if (vals.orden) data.orden = parseInt(vals.orden)

    setOfertas(prev =>
      prev.map(o =>
        o.id === id ? { ...o, ...data } as OfertaItem : o
      )
    )
    setEditando(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })

    try {
      await actualizarOferta(id, data as Parameters<typeof actualizarOferta>[1])
      router.refresh()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div>
      {/* Canal selector */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          <select
            value={canal}
            onChange={e => setCanal(e.target.value as 'ofertas' | 'hotsale')}
            className="appearance-none pl-4 pr-10 py-2.5 text-base rounded-lg border outline-none cursor-pointer"
            style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
          >
            <option value="ofertas">Ofertas</option>
            <option value="hotsale">Hot Sale</option>
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-acero)' }} />
        </div>

        <button
          onClick={() => setModalAbierto(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{ background: 'var(--color-granito-oscuro)', color: 'var(--color-acero-brillo)' }}
        >
          <Plus size={16} />
          Agregar producto
        </button>

        <span className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>
          {ofertasFiltradas.length} producto{ofertasFiltradas.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-acero-claro)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--color-granito-oscuro)' }}>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)', width: '35%' }}>Producto</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Precio lista</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>Precio oferta</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)' }}>% Dto.</th>
                <th className="text-center px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)', width: '5%' }}>Orden</th>
                <th className="text-center px-4 py-3 font-medium" style={{ color: 'var(--color-acero-claro)', width: '8%' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {ofertasFiltradas.map((oferta, i) => {
                const edit = editando[oferta.id]
                const prod = oferta.producto
                const precioLista = prod?.precio_lista1 ?? 0
                return (
                  <tr
                    key={oferta.id}
                    style={{
                      background: i % 2 === 0 ? 'white' : 'var(--color-acero-brillo)',
                      borderBottom: '1px solid var(--color-acero-claro)',
                    }}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 relative">
                          {prod && fotoMap[prod.id] ? (
                            <Image src={fotoMap[prod.id]} alt="" fill className="object-cover" sizes="40px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'var(--color-acero)' }}>
                              ?
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="font-medium block" style={{ color: 'var(--foreground)' }}>{prod?.titulo ?? '—'}</span>
                          <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>{prod?.codigo_interno ?? ''}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--color-acero)' }}>
                      ${precioLista}
                    </td>
                    <td className="px-4 py-2.5">
                      {edit ? (
                        <input
                          type="number"
                          step="0.01"
                          value={edit.precio_oferta ?? ''}
                          onChange={e => {
                            const val = e.target.value
                            const nuevoDescuento = precioLista > 0
                              ? Math.round((1 - parseFloat(val || '0') / precioLista) * 100)
                              : 0
                            setEditando(prev => ({
                              ...prev,
                              [oferta.id]: { ...prev[oferta.id], precio_oferta: val, descuento: String(nuevoDescuento) },
                            }))
                          }}
                          onBlur={() => saveEdit(oferta.id)}
                          onKeyDown={e => e.key === 'Enter' && saveEdit(oferta.id)}
                          className="w-24 px-2 py-1 border rounded text-sm outline-none"
                          style={{ borderColor: 'var(--color-acero-claro)' }}
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => initEdit(oferta)}
                          className="hover:underline cursor-pointer text-left"
                          style={{ color: 'var(--foreground)' }}
                        >
                          ${oferta.precio_oferta}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {edit ? (
                        <input
                          type="number"
                          value={edit.descuento ?? ''}
                          onChange={e => {
                            const val = e.target.value
                            const nuevoPrecio = precioLista > 0
                              ? +(precioLista * (1 - parseInt(val || '0') / 100)).toFixed(2)
                              : 0
                            setEditando(prev => ({
                              ...prev,
                              [oferta.id]: { ...prev[oferta.id], descuento: val, precio_oferta: String(nuevoPrecio) },
                            }))
                          }}
                          onBlur={() => saveEdit(oferta.id)}
                          onKeyDown={e => e.key === 'Enter' && saveEdit(oferta.id)}
                          className="w-20 px-2 py-1 border rounded text-sm outline-none"
                          style={{ borderColor: 'var(--color-acero-claro)' }}
                        />
                      ) : (
                        <button
                          onClick={() => initEdit(oferta)}
                          className="hover:underline cursor-pointer text-left"
                          style={{ color: oferta.descuento_porcentaje > 0 ? '#dc2626' : 'var(--foreground)' }}
                        >
                          {oferta.descuento_porcentaje}%
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {edit ? (
                        <input
                          type="number"
                          value={edit.orden ?? ''}
                          onChange={e => setEditando(prev => ({ ...prev, [oferta.id]: { ...prev[oferta.id], orden: e.target.value } }))}
                          onBlur={() => saveEdit(oferta.id)}
                          onKeyDown={e => e.key === 'Enter' && saveEdit(oferta.id)}
                          className="w-14 px-2 py-1 border rounded text-sm text-center outline-none"
                          style={{ borderColor: 'var(--color-acero-claro)' }}
                        />
                      ) : (
                        <button
                          onClick={() => initEdit(oferta)}
                          className="hover:underline cursor-pointer text-center"
                          style={{ color: 'var(--color-acero-oscuro)' }}
                        >
                          {oferta.orden}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => handleEliminar(oferta.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="Eliminar"
                      >
                        <X size={14} style={{ color: '#dc2626' }} />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {ofertasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-base" style={{ color: 'var(--color-acero-oscuro)' }}>
                    No hay productos en {canal === 'ofertas' ? 'Ofertas' : 'Hot Sale'}. Agregá productos usando el botón de arriba.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal selector de producto */}
      {modalAbierto && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setModalAbierto(false)} />
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
            style={{ background: 'white' }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
                Agregar producto a {canal === 'ofertas' ? 'Ofertas' : 'Hot Sale'}
              </h2>
              <button onClick={() => setModalAbierto(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-4">
              <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-acero)' }} />
                <input
                  value={busquedaModal}
                  onChange={e => setBusquedaModal(e.target.value)}
                  placeholder="Buscar producto por nombre o código…"
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border outline-none"
                  style={{ borderColor: 'var(--color-acero-claro)', background: 'white', color: 'var(--foreground)' }}
                  autoFocus
                />
              </div>

              <div className="max-h-80 overflow-y-auto space-y-1">
                {productosDisponibles.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleAgregar(p.id)}
                    disabled={agregando}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    <div className="w-9 h-9 rounded bg-gray-100 overflow-hidden flex-shrink-0 relative">
                      {fotoMap[p.id] ? (
                        <Image src={fotoMap[p.id]} alt="" fill className="object-cover" sizes="36px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'var(--color-acero)' }}>?</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{p.titulo}</p>
                      <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>{p.codigo_interno ?? ''} · ${p.precio_lista1 ?? 0}</p>
                    </div>
                    {agregando ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Plus size={16} style={{ color: 'var(--color-acero)' }} />
                    )}
                  </button>
                ))}
                {productosDisponibles.length === 0 && (
                  <p className="text-sm text-center py-8" style={{ color: 'var(--color-acero-oscuro)' }}>
                    No hay más productos disponibles para agregar.
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
