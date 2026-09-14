'use client'

import { useState, useTransition } from 'react'
import { Ship, Plus, Trash2, ChevronDown, ChevronRight, Check, AlertCircle, Search } from 'lucide-react'
import { formatPrecio } from '@/lib/utils'
import { labelRol } from '@/lib/roles'
import { getSwatchStyle, capitalizeVariante } from '@/lib/variantes'
import {
  ETAPA_LABEL,
  ETAPA_AYUDA,
  ETAPA_COLOR,
  type EtapaContainer,
} from '@/lib/containers'
import {
  crearViaje,
  actualizarViaje,
  cambiarEtapa,
  importarItems,
  agregarDesdeCatalogo,
  borrarItem,
  ajustarCantidadItem,
  setPermisoContainers,
  marcarMovidaAGesu,
  marcarHito,
  confirmarReserva,
  cancelarReservaAdmin,
} from '@/app/actions/containers-admin'

export interface ItemAdmin {
  id: number
  codigo_interno: string
  titulo: string
  variante: string | null
  cantidad: number
  comprometido: number
}

export interface ViajeAdmin {
  id: string
  nombre: string
  gesu_cuenta_id: string | null
  gesu_token_env: string | null
  etapa: EtapaContainer
  descuento_china: number
  descuento_oceano: number
  fecha_cierre_china: string | null
  fecha_embarque: string | null
  fecha_arribo_est: string | null
  fecha_liberacion: string | null
  cotizacion_congelada: number | null
  notas: string | null
  items: ItemAdmin[]
  /** Lo vendido por color, agregado. En China es la orden de compra; después, qué mover. */
  demanda: {
    codigo: string
    titulo: string
    variante: string | null
    cantidad: number
    clientes: string[]
  }[]
}

export interface ReservaAdmin {
  id: string
  numero: number
  containerId: string
  cliente: string
  rol: string
  etapaCompra: string
  descuentoPct: number
  total: number | null
  moneda: string | null
  estado: 'solicitada' | 'confirmada' | 'cancelada'
  facturada: boolean
  entregada: boolean
  movidaAGesu: boolean
  creada: string
}

export interface ClientePermiso {
  id: string
  nombre: string
  email: string
  rol: string
  /** null = hereda del canal. */
  habilitado: boolean | null
  heredaDelCanal: boolean
}

export interface ProductoCatalogo {
  id: number
  codigo: string
  titulo: string
  /** Nombres de color/medida del producto. Vacío = producto sin variantes. */
  variantes: string[]
}

/** El orden real del viaje. Se avanza de a un paso, a mano. */
const SECUENCIA: EtapaContainer[] = ['borrador', 'china', 'oceano', 'puerto', 'cerrado']

type Pestana = 'viajes' | 'reservas' | 'permisos'

export function ContainersClient({
  viajes,
  reservas,
  clientes,
  catalogo,
}: {
  viajes: ViajeAdmin[]
  reservas: ReservaAdmin[]
  clientes: ClientePermiso[]
  catalogo: ProductoCatalogo[]
}) {
  const [pestana, setPestana] = useState<Pestana>('viajes')
  const [abierto, setAbierto] = useState<string | null>(viajes[0]?.id ?? null)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [pendiente, iniciar] = useTransition()

  function ejecutar(fn: () => Promise<{ ok: boolean; error?: string }>, exito: string) {
    iniciar(async () => {
      const res = await fn()
      setMensaje(res.ok ? { tipo: 'ok', texto: exito } : { tipo: 'error', texto: res.error ?? 'Falló la operación' })
    })
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-2 mb-1">
        <Ship size={20} style={{ color: 'var(--color-granito)' }} aria-hidden="true" />
        <h1 className="text-2xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
          Containers
        </h1>
      </div>
      <p className="text-base mb-6" style={{ color: 'var(--color-acero-oscuro)' }}>
        Preventa de mercadería importada. Cada viaje es una subcuenta de GESU; las etapas,
        los descuentos y los permisos se manejan acá.
      </p>

      {mensaje && (
        <div
          className="rounded-lg px-4 py-3 mb-6 text-sm flex items-start gap-2"
          style={{
            background: mensaje.tipo === 'ok' ? '#10b98122' : '#ef444422',
            color: mensaje.tipo === 'ok' ? '#10b981' : '#ef4444',
          }}
          role="status"
        >
          {mensaje.tipo === 'ok' ? <Check size={15} className="mt-0.5" /> : <AlertCircle size={15} className="mt-0.5" />}
          <span>{mensaje.texto}</span>
        </div>
      )}

      <div className="flex gap-1 mb-6" style={{ borderBottom: '1px solid var(--color-acero-claro)' }}>
        {([
          ['viajes', `Viajes (${viajes.length})`],
          ['reservas', `Reservas (${reservas.filter(r => r.estado !== 'cancelada').length})`],
          ['permisos', 'Quién puede comprar'],
        ] as [Pestana, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setPestana(id)}
            className="px-4 py-2 text-sm transition-colors"
            style={{
              color: pestana === id ? 'var(--foreground)' : 'var(--color-acero-oscuro)',
              borderBottom: pestana === id ? '2px solid var(--color-granito)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {pestana === 'viajes' && (
        <>
          <NuevoViaje onCreado={(nombre) => ejecutar(() => crearViaje({ nombre }), `Viaje "${nombre}" creado.`)} pendiente={pendiente} />
          {viajes.length === 0 && (
            <p className="text-sm mt-6" style={{ color: 'var(--color-acero-oscuro)' }}>
              Todavía no hay ningún viaje cargado.
            </p>
          )}
          <div className="flex flex-col gap-3 mt-6">
            {viajes.map(v => (
              <FichaViaje
                key={v.id}
                viaje={v}
                abierto={abierto === v.id}
                onToggle={() => setAbierto(abierto === v.id ? null : v.id)}
                reservas={reservas.filter(r => r.containerId === v.id && r.estado !== 'cancelada')}
                catalogo={catalogo}
                ejecutar={ejecutar}
                pendiente={pendiente}
              />
            ))}
          </div>
        </>
      )}

      {pestana === 'reservas' && (
        <TablaReservas reservas={reservas} viajes={viajes} ejecutar={ejecutar} pendiente={pendiente} />
      )}

      {pestana === 'permisos' && (
        <TablaPermisos clientes={clientes} ejecutar={ejecutar} pendiente={pendiente} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function NuevoViaje({ onCreado, pendiente }: { onCreado: (nombre: string) => void; pendiente: boolean }) {
  const [nombre, setNombre] = useState('')

  return (
    <div className="flex gap-2">
      <input
        value={nombre}
        onChange={e => setNombre(e.target.value)}
        placeholder="Nombre del viaje — ej. Contenedor 5"
        className="flex-1 px-3 py-2 text-sm rounded"
        style={{ border: '1px solid var(--color-acero-claro)', color: 'var(--foreground)' }}
      />
      <button
        onClick={() => { if (nombre.trim()) { onCreado(nombre.trim()); setNombre('') } }}
        disabled={pendiente || !nombre.trim()}
        className="flex items-center gap-1.5 px-4 py-2 text-xs tracking-widest uppercase disabled:opacity-40"
        style={{ background: 'var(--color-granito-oscuro)', color: 'white' }}
      >
        <Plus size={13} aria-hidden="true" /> Crear
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------

function FichaViaje({
  viaje,
  abierto,
  onToggle,
  reservas,
  catalogo,
  ejecutar,
  pendiente,
}: {
  viaje: ViajeAdmin
  abierto: boolean
  onToggle: () => void
  reservas: ReservaAdmin[]
  catalogo: ProductoCatalogo[]
  ejecutar: (fn: () => Promise<{ ok: boolean; error?: string }>, exito: string) => void
  pendiente: boolean
}) {
  const [form, setForm] = useState({
    nombre: viaje.nombre,
    gesu_cuenta_id: viaje.gesu_cuenta_id ?? '',
    gesu_token_env: viaje.gesu_token_env ?? '',
    descuento_china: String(viaje.descuento_china),
    descuento_oceano: String(viaje.descuento_oceano),
    fecha_cierre_china: viaje.fecha_cierre_china ?? '',
    fecha_embarque: viaje.fecha_embarque ?? '',
    fecha_arribo_est: viaje.fecha_arribo_est ?? '',
    fecha_liberacion: viaje.fecha_liberacion ?? '',
    notas: viaje.notas ?? '',
  })
  const [pegado, setPegado] = useState('')
  const [resultadoImport, setResultadoImport] = useState<string | null>(null)

  const totalUnidades = viaje.items.reduce((a, i) => a + i.cantidad, 0)
  const totalComprometido = viaje.items.reduce((a, i) => a + i.comprometido, 0)
  const idx = SECUENCIA.indexOf(viaje.etapa)
  const siguiente = idx >= 0 && idx < SECUENCIA.length - 1 ? SECUENCIA[idx + 1] : null

  async function handleImportar() {
    const res = await importarItems(viaje.id, pegado)
    if (!res.ok) {
      setResultadoImport(res.error ?? 'No se pudo importar.')
      return
    }
    const faltantes = res.sinProducto?.length
      ? ` · Sin producto en el catálogo: ${res.sinProducto.slice(0, 8).join(', ')}${res.sinProducto.length > 8 ? '…' : ''}`
      : ''
    setResultadoImport(`Importados ${res.importados} ítems.${faltantes}`)
    setPegado('')
  }

  return (
    <div className="rounded-lg" style={{ border: '1px solid var(--color-acero-claro)' }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        aria-expanded={abierto}
      >
        {abierto ? <ChevronDown size={15} aria-hidden="true" /> : <ChevronRight size={15} aria-hidden="true" />}
        <span
          className="inline-block w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: ETAPA_COLOR[viaje.etapa] }}
          aria-hidden="true"
        />
        <span className="text-sm font-medium flex-1" style={{ color: 'var(--foreground)' }}>
          {viaje.nombre}
        </span>
        <span className="text-xs" style={{ color: ETAPA_COLOR[viaje.etapa] }}>
          {ETAPA_LABEL[viaje.etapa]}
        </span>
        <span className="text-xs tabular-nums" style={{ color: 'var(--color-acero-oscuro)' }}>
          {totalComprometido}/{totalUnidades} u. · {reservas.length} reservas
        </span>
      </button>

      {abierto && (
        <div className="px-4 pb-4 flex flex-col gap-5" style={{ borderTop: '1px solid var(--color-acero-claro)' }}>
          {/* Etapa */}
          <div className="pt-4">
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-acero-oscuro)' }}>
              Etapa del viaje
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {SECUENCIA.map((e, i) => (
                <span
                  key={e}
                  className="px-2 py-1 text-xs rounded"
                  style={{
                    background: i === idx ? ETAPA_COLOR[e] : 'transparent',
                    color: i === idx ? 'white' : i < idx ? 'var(--color-acero-oscuro)' : 'var(--color-acero-claro)',
                    border: `1px solid ${i === idx ? ETAPA_COLOR[e] : 'var(--color-acero-claro)'}`,
                  }}
                >
                  {ETAPA_LABEL[e]}
                </span>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--color-acero-oscuro)' }}>
              {ETAPA_AYUDA[viaje.etapa]}
            </p>
            {siguiente && (
              <button
                onClick={() => ejecutar(() => cambiarEtapa(viaje.id, siguiente), `"${viaje.nombre}" pasó a ${ETAPA_LABEL[siguiente]}.`)}
                disabled={pendiente}
                className="mt-3 px-4 py-2 text-xs tracking-widest uppercase disabled:opacity-40"
                style={{ background: 'var(--color-granito-oscuro)', color: 'white' }}
              >
                Avanzar a {ETAPA_LABEL[siguiente]}
              </button>
            )}
            <p className="text-[11px] mt-2" style={{ color: 'var(--color-acero-oscuro)' }}>
              La etapa la avanzás vos, nunca el calendario: si el barco se demora, el sistema
              no puede decir que llegó.
            </p>
          </div>

          {/* Datos */}
          <div>
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-acero-oscuro)' }}>
              Datos del viaje
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Campo label="Nombre" valor={form.nombre} onChange={v => setForm({ ...form, nombre: v })} />
              <Campo label="Id de cuenta GESU" valor={form.gesu_cuenta_id} onChange={v => setForm({ ...form, gesu_cuenta_id: v })} />
              <Campo
                label="Variable de entorno del token"
                ayuda="El nombre, no el token. Ej. GESU_TOKEN_CONTENEDOR_3"
                valor={form.gesu_token_env}
                onChange={v => setForm({ ...form, gesu_token_env: v })}
              />
              <div />
              <Campo label="Descuento en China (%)" tipo="number" valor={form.descuento_china} onChange={v => setForm({ ...form, descuento_china: v })} />
              <Campo label="Descuento en Océano (%)" tipo="number" valor={form.descuento_oceano} onChange={v => setForm({ ...form, descuento_oceano: v })} />
              <Campo label="Cierre de pedidos a China" tipo="date" valor={form.fecha_cierre_china} onChange={v => setForm({ ...form, fecha_cierre_china: v })} />
              <Campo label="Embarque" tipo="date" valor={form.fecha_embarque} onChange={v => setForm({ ...form, fecha_embarque: v })} />
              <Campo label="Arribo estimado" tipo="date" valor={form.fecha_arribo_est} onChange={v => setForm({ ...form, fecha_arribo_est: v })} />
              <Campo label="Liberación de aduana" tipo="date" valor={form.fecha_liberacion} onChange={v => setForm({ ...form, fecha_liberacion: v })} />
            </div>
            <button
              onClick={() => ejecutar(() => actualizarViaje(viaje.id, {
                nombre: form.nombre,
                gesu_cuenta_id: form.gesu_cuenta_id || null,
                gesu_token_env: form.gesu_token_env || null,
                descuento_china: Number(form.descuento_china) || 0,
                descuento_oceano: Number(form.descuento_oceano) || 0,
                fecha_cierre_china: form.fecha_cierre_china || null,
                fecha_embarque: form.fecha_embarque || null,
                fecha_arribo_est: form.fecha_arribo_est || null,
                fecha_liberacion: form.fecha_liberacion || null,
                notas: form.notas || null,
              }), 'Datos del viaje guardados.')}
              disabled={pendiente}
              className="mt-3 px-4 py-2 text-xs tracking-widest uppercase disabled:opacity-40"
              style={{ background: 'var(--color-granito)', color: 'white' }}
            >
              Guardar datos
            </button>
          </div>

          {/* Demanda agregada */}
          {viaje.demanda.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>
                {viaje.etapa === 'china' ? 'Orden de compra a China' : 'Para mover a la cuenta principal'}
              </p>
              <p className="text-[11px] mb-2" style={{ color: 'var(--color-acero-oscuro)' }}>
                {viaje.etapa === 'china'
                  ? 'Lo que pidió el conjunto de clientes, sumado por color. Es lo que hay que comprar.'
                  : 'Lo vendido de este viaje, sumado por color. Descontar de la cuenta del container, cargar en la principal y facturar desde ahí.'}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ color: 'var(--color-acero-oscuro)' }}>
                      <th className="text-left font-normal py-1">Código</th>
                      <th className="text-left font-normal py-1">Color</th>
                      <th className="text-right font-normal py-1">Unidades</th>
                      <th className="text-left font-normal py-1">Clientes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viaje.demanda.map(d => (
                      <tr key={`${d.codigo}-${d.variante}`} style={{ borderTop: '1px solid var(--color-acero-claro)' }}>
                        <td className="py-1.5 font-mono">{d.codigo}</td>
                        <td className="py-1.5">{d.variante ?? '—'}</td>
                        <td className="py-1.5 text-right tabular-nums font-medium">{d.cantidad}</td>
                        <td className="py-1.5" style={{ color: 'var(--color-acero-oscuro)' }}>
                          {d.clientes.join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ítems */}
          <div>
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-acero-oscuro)' }}>
              Qué viene ({viaje.items.length} líneas · {totalUnidades} unidades)
            </p>

            {viaje.items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ color: 'var(--color-acero-oscuro)' }}>
                      <th className="text-left font-normal py-1">Código</th>
                      <th className="text-left font-normal py-1">Producto</th>
                      <th className="text-left font-normal py-1">Color</th>
                      <th className="text-right font-normal py-1">Cantidad</th>
                      <th className="text-right font-normal py-1">Reservado</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {viaje.items.map(it => (
                      <tr key={it.id} style={{ borderTop: '1px solid var(--color-acero-claro)' }}>
                        <td className="py-1.5 font-mono">{it.codigo_interno}</td>
                        <td className="py-1.5 max-w-[220px] truncate">{it.titulo}</td>
                        <td className="py-1.5">{it.variante ?? '—'}</td>
                        <td className="py-1.5 text-right">
                          <input
                            type="number"
                            defaultValue={it.cantidad}
                            min={it.comprometido}
                            onBlur={e => {
                              const n = parseInt(e.target.value, 10)
                              if (!isNaN(n) && n !== it.cantidad) {
                                ejecutar(() => ajustarCantidadItem(it.id, n), 'Cantidad actualizada.')
                              }
                            }}
                            className="w-16 px-1 py-0.5 text-right rounded"
                            style={{ border: '1px solid var(--color-acero-claro)' }}
                            aria-label={`Cantidad de ${it.codigo_interno} ${it.variante ?? ''}`}
                          />
                        </td>
                        <td className="py-1.5 text-right tabular-nums">{it.comprometido}</td>
                        <td className="py-1.5 text-right">
                          <button
                            onClick={() => ejecutar(() => borrarItem(it.id), 'Ítem eliminado.')}
                            disabled={pendiente || it.comprometido > 0}
                            className="disabled:opacity-30"
                            aria-label={`Borrar ${it.codigo_interno}`}
                            title={it.comprometido > 0 ? 'Tiene reservas' : 'Borrar'}
                          >
                            <Trash2 size={13} style={{ color: '#ef4444' }} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <SelectorCatalogo
              catalogo={catalogo}
              pendiente={pendiente}
              onAgregar={(productoId, lineas, titulo) =>
                ejecutar(() => agregarDesdeCatalogo(viaje.id, productoId, lineas), `${titulo} agregado al viaje.`)
              }
            />

            <details className="mt-4">
              <summary className="text-xs cursor-pointer" style={{ color: 'var(--color-acero-oscuro)' }}>
                ¿Tenés una lista larga? Pegar desde una planilla
              </summary>
              <div className="mt-2">
              <label className="text-xs block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>
                Una línea por color:{' '}
                <span className="font-mono">código · color · cantidad</span> (o{' '}
                <span className="font-mono">código · cantidad</span> si no tiene colores)
              </label>
              <textarea
                value={pegado}
                onChange={e => setPegado(e.target.value)}
                rows={4}
                placeholder={'MT-0042\tNEGRO\t120\nMT-0042\tAQUA\t80\nBT1/2\t500'}
                className="w-full px-3 py-2 text-xs font-mono rounded"
                style={{ border: '1px solid var(--color-acero-claro)', color: 'var(--foreground)' }}
              />
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={handleImportar}
                  disabled={pendiente || !pegado.trim()}
                  className="px-4 py-2 text-xs tracking-widest uppercase disabled:opacity-40"
                  style={{ background: 'var(--color-granito)', color: 'white' }}
                >
                  Importar
                </button>
                {resultadoImport && (
                  <span className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                    {resultadoImport}
                  </span>
                )}
              </div>
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

/**
 * Elegir del catálogo en vez de escribir códigos.
 *
 * Gastón trae mercadería que ya vende, así que el alta natural es buscar el
 * producto y poner cuánto trae de cada color. El catálogo entero son ~171
 * artículos: viene completo del server y se filtra acá, sin pegarle a la base en
 * cada tecla.
 */
function SelectorCatalogo({
  catalogo,
  onAgregar,
  pendiente,
}: {
  catalogo: ProductoCatalogo[]
  onAgregar: (productoId: number, lineas: { variante: string | null; cantidad: number }[], titulo: string) => void
  pendiente: boolean
}) {
  const [busqueda, setBusqueda] = useState('')
  const [elegido, setElegido] = useState<ProductoCatalogo | null>(null)
  const [cantidades, setCantidades] = useState<Record<string, string>>({})

  const q = busqueda.trim().toLowerCase()
  const resultados = q
    ? catalogo
        .filter(p => p.titulo.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q))
        .slice(0, 8)
    : []

  // El producto sin variantes es una sola línea con variante null.
  const filas = elegido ? (elegido.variantes.length > 0 ? elegido.variantes : [null]) : []
  const totalElegido = filas.reduce((a, v) => a + (parseInt(cantidades[v ?? ''] ?? '', 10) || 0), 0)

  function elegir(p: ProductoCatalogo) {
    setElegido(p)
    setCantidades({})
    setBusqueda('')
  }

  function confirmar() {
    if (!elegido) return
    const lineas = filas
      .map(v => ({ variante: v, cantidad: parseInt(cantidades[v ?? ''] ?? '', 10) || 0 }))
      .filter(l => l.cantidad > 0)
    if (lineas.length === 0) return
    onAgregar(elegido.id, lineas, elegido.titulo)
    setElegido(null)
    setCantidades({})
  }

  return (
    <div className="mt-3 rounded-lg p-3" style={{ border: '1px dashed var(--color-acero-claro)' }}>
      <p className="text-xs mb-2" style={{ color: 'var(--color-acero-oscuro)' }}>
        Agregar del catálogo — buscá el producto y poné cuánto traés de cada color.
      </p>

      {!elegido && (
        <>
          <div className="relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--color-acero-oscuro)' }}
              aria-hidden="true"
            />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o código…"
              className="w-full pl-8 pr-3 py-2 text-sm rounded"
              style={{ border: '1px solid var(--color-acero-claro)', color: 'var(--foreground)' }}
              aria-label="Buscar producto en el catálogo"
            />
          </div>

          {q && resultados.length === 0 && (
            <p className="text-xs mt-2" style={{ color: 'var(--color-acero-oscuro)' }}>
              Ningún producto coincide con “{busqueda}”.
            </p>
          )}

          {resultados.length > 0 && (
            <ul className="mt-2 flex flex-col">
              {resultados.map(p => (
                <li key={p.id}>
                  <button
                    onClick={() => elegir(p)}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:opacity-70 flex items-center gap-2"
                  >
                    <span className="font-mono flex-shrink-0" style={{ color: 'var(--color-acero-oscuro)' }}>
                      {p.codigo}
                    </span>
                    <span className="min-w-0 flex-1 truncate" style={{ color: 'var(--foreground)' }}>
                      {p.titulo}
                    </span>
                    <span className="flex-shrink-0" style={{ color: 'var(--color-acero-oscuro)' }}>
                      {p.variantes.length > 0 ? `${p.variantes.length} colores` : 'sin colores'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {elegido && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
              {elegido.codigo}
            </span>
            <span className="text-sm font-medium min-w-0 flex-1 truncate" style={{ color: 'var(--foreground)' }}>
              {elegido.titulo}
            </span>
            <button
              onClick={() => { setElegido(null); setCantidades({}) }}
              className="text-xs underline flex-shrink-0"
              style={{ color: 'var(--color-acero-oscuro)' }}
            >
              Cambiar
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filas.map(variante => (
              <label key={variante ?? '_'} className="flex items-center gap-2">
                {variante && (
                  <span
                    className="inline-block rounded flex-shrink-0"
                    style={{ width: 16, height: 16, ...getSwatchStyle(variante), border: '1px solid rgba(0,0,0,0.12)' }}
                    aria-hidden="true"
                  />
                )}
                <span className="text-xs min-w-0 flex-1 truncate" style={{ color: 'var(--foreground)' }}>
                  {variante ? capitalizeVariante(variante) : 'Único'}
                </span>
                <input
                  type="number"
                  min={0}
                  value={cantidades[variante ?? ''] ?? ''}
                  onChange={e => setCantidades(prev => ({ ...prev, [variante ?? '']: e.target.value }))}
                  placeholder="0"
                  className="w-16 px-1.5 py-1 text-xs text-right rounded flex-shrink-0"
                  style={{ border: '1px solid var(--color-acero-claro)' }}
                  aria-label={`Cantidad de ${variante ?? 'unidad'}`}
                />
              </label>
            ))}
          </div>

          <button
            onClick={confirmar}
            disabled={pendiente || totalElegido === 0}
            className="mt-3 px-4 py-2 text-xs tracking-widest uppercase disabled:opacity-40"
            style={{ background: 'var(--color-granito-oscuro)', color: 'white' }}
          >
            {totalElegido === 0 ? 'Poné una cantidad' : `Agregar ${totalElegido} u. al viaje`}
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function TablaReservas({
  reservas,
  viajes,
  ejecutar,
  pendiente,
}: {
  reservas: ReservaAdmin[]
  viajes: ViajeAdmin[]
  ejecutar: (fn: () => Promise<{ ok: boolean; error?: string }>, exito: string) => void
  pendiente: boolean
}) {
  const nombreViaje = new Map(viajes.map(v => [v.id, v.nombre]))
  const pendientesDeMover = reservas.filter(r => r.estado === 'confirmada' && !r.movidaAGesu)

  if (reservas.length === 0) {
    return <p className="text-sm" style={{ color: 'var(--color-acero-oscuro)' }}>Todavía no hay reservas.</p>
  }

  return (
    <div className="flex flex-col gap-6">
      {pendientesDeMover.length > 0 && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ background: '#f59e0b18', color: 'var(--foreground)' }}>
          <p className="font-medium mb-1">
            {pendientesDeMover.length} reserva{pendientesDeMover.length > 1 ? 's' : ''} para mover en GESU
          </p>
          <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
            Descontar de la cuenta del container, cargar en la principal y facturar desde ahí.
            Marcá &quot;Movida&quot; cuando esté hecho, o el comprometido y el stock de GESU se separan
            sin que nadie se entere.
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ color: 'var(--color-acero-oscuro)' }}>
              <th className="text-left font-normal py-1">#</th>
              <th className="text-left font-normal py-1">Cliente</th>
              <th className="text-left font-normal py-1">Viaje</th>
              <th className="text-left font-normal py-1">Etapa</th>
              <th className="text-right font-normal py-1">Total</th>
              <th className="text-left font-normal py-1">Estado</th>
              <th className="text-center font-normal py-1">Movida</th>
              <th className="text-center font-normal py-1">Facturada</th>
              <th className="text-center font-normal py-1">Entregada</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {reservas.map(r => (
              <tr
                key={r.id}
                style={{ borderTop: '1px solid var(--color-acero-claro)', opacity: r.estado === 'cancelada' ? 0.5 : 1 }}
              >
                <td className="py-2 font-mono" style={{ color: 'var(--color-acero-oscuro)' }}>{r.numero}</td>
                <td className="py-2">
                  <span style={{ color: 'var(--foreground)' }}>{r.cliente}</span>
                  <span className="block text-[11px]" style={{ color: 'var(--color-acero-oscuro)' }}>
                    {labelRol(r.rol)}
                  </span>
                </td>
                <td className="py-2">{nombreViaje.get(r.containerId) ?? '—'}</td>
                <td className="py-2">
                  {ETAPA_LABEL[r.etapaCompra as EtapaContainer] ?? r.etapaCompra}
                  {r.descuentoPct > 0 && (
                    <span className="block text-[11px]" style={{ color: 'var(--color-acero-oscuro)' }}>
                      −{r.descuentoPct}%
                    </span>
                  )}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {r.total != null ? formatPrecio(r.total, r.moneda) : '—'}
                </td>
                <td className="py-2">
                  {r.estado === 'solicitada' ? (
                    <button
                      onClick={() => ejecutar(() => confirmarReserva(r.id), 'Reserva confirmada.')}
                      disabled={pendiente}
                      className="px-2 py-1 rounded text-[11px]"
                      style={{ background: 'var(--color-acero-brillo)', color: 'var(--color-granito-oscuro)' }}
                    >
                      Confirmar
                    </button>
                  ) : (
                    <span>{r.estado}</span>
                  )}
                </td>
                <Tilde hecho={r.movidaAGesu} onToggle={v => ejecutar(() => marcarMovidaAGesu(r.id, v), v ? 'Marcada como movida.' : 'Desmarcada.')} pendiente={pendiente} etiqueta={`Movida a GESU de ${r.cliente}`} />
                <Tilde hecho={r.facturada} onToggle={v => ejecutar(() => marcarHito(r.id, 'facturada', v), v ? 'Marcada como facturada.' : 'Desmarcada.')} pendiente={pendiente} etiqueta={`Facturada de ${r.cliente}`} />
                <Tilde hecho={r.entregada} onToggle={v => ejecutar(() => marcarHito(r.id, 'entregada', v), v ? 'Marcada como entregada.' : 'Desmarcada.')} pendiente={pendiente} etiqueta={`Entregada de ${r.cliente}`} />
                <td className="py-2 text-right">
                  {r.estado !== 'cancelada' && (
                    <button
                      onClick={() => ejecutar(() => cancelarReservaAdmin(r.id), 'Reserva cancelada y mercadería liberada.')}
                      disabled={pendiente}
                      aria-label={`Cancelar reserva de ${r.cliente}`}
                    >
                      <Trash2 size={13} style={{ color: '#ef4444' }} aria-hidden="true" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px]" style={{ color: 'var(--color-acero-oscuro)' }}>
        Facturada y entregada son independientes a propósito: acá se factura mercadería por
        venir, así que una reserva puede estar facturada y sin entregar durante 60 días.
      </p>
    </div>
  )
}

function Tilde({
  hecho,
  onToggle,
  pendiente,
  etiqueta,
}: {
  hecho: boolean
  onToggle: (valor: boolean) => void
  pendiente: boolean
  etiqueta: string
}) {
  return (
    <td className="py-2 text-center">
      <button
        onClick={() => onToggle(!hecho)}
        disabled={pendiente}
        className="w-5 h-5 rounded inline-flex items-center justify-center disabled:opacity-40"
        style={{
          border: `1px solid ${hecho ? '#10b981' : 'var(--color-acero-claro)'}`,
          background: hecho ? '#10b981' : 'transparent',
        }}
        aria-pressed={hecho}
        aria-label={etiqueta}
      >
        {hecho && <Check size={11} className="text-white" strokeWidth={3} aria-hidden="true" />}
      </button>
    </td>
  )
}

// ---------------------------------------------------------------------------

function TablaPermisos({
  clientes,
  ejecutar,
  pendiente,
}: {
  clientes: ClientePermiso[]
  ejecutar: (fn: () => Promise<{ ok: boolean; error?: string }>, exito: string) => void
  pendiente: boolean
}) {
  const [filtro, setFiltro] = useState('')
  const visibles = clientes.filter(c =>
    !filtro ||
    c.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
    c.email.toLowerCase().includes(filtro.toLowerCase()),
  )

  return (
    <div>
      <p className="text-xs mb-3" style={{ color: 'var(--color-acero-oscuro)' }}>
        Quien no tiene acceso no ve el botón &quot;¿Cuándo viene?&quot; en ninguna card.
        <strong> Hereda</strong> toma la configuración del canal; <strong>Sí</strong> y{' '}
        <strong>No</strong> son decisiones sobre esa cuenta en particular.
      </p>

      <input
        value={filtro}
        onChange={e => setFiltro(e.target.value)}
        placeholder="Buscar por nombre o email"
        className="w-full sm:w-80 px-3 py-2 text-sm rounded mb-4"
        style={{ border: '1px solid var(--color-acero-claro)', color: 'var(--foreground)' }}
      />

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ color: 'var(--color-acero-oscuro)' }}>
              <th className="text-left font-normal py-1">Cliente</th>
              <th className="text-left font-normal py-1">Canal</th>
              <th className="text-left font-normal py-1">Acceso</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map(c => {
              const efectivo = c.habilitado ?? c.heredaDelCanal
              return (
                <tr key={c.id} style={{ borderTop: '1px solid var(--color-acero-claro)' }}>
                  <td className="py-2">
                    <span style={{ color: 'var(--foreground)' }}>{c.nombre}</span>
                    <span className="block text-[11px]" style={{ color: 'var(--color-acero-oscuro)' }}>
                      {c.email}
                    </span>
                  </td>
                  <td className="py-2">{labelRol(c.rol)}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-1">
                      {([
                        [null, `Hereda (${c.heredaDelCanal ? 'sí' : 'no'})`],
                        [true, 'Sí'],
                        [false, 'No'],
                      ] as [boolean | null, string][]).map(([valor, label]) => {
                        const activo = c.habilitado === valor
                        return (
                          <button
                            key={String(valor)}
                            onClick={() => ejecutar(
                              () => setPermisoContainers(c.id, valor),
                              `Permiso de ${c.nombre} actualizado.`,
                            )}
                            disabled={pendiente}
                            className="px-2 py-1 rounded text-[11px] disabled:opacity-40"
                            style={{
                              background: activo ? 'var(--color-granito-oscuro)' : 'transparent',
                              color: activo ? 'white' : 'var(--color-acero-oscuro)',
                              border: '1px solid var(--color-acero-claro)',
                            }}
                            aria-pressed={activo}
                          >
                            {label}
                          </button>
                        )
                      })}
                      <span
                        className="ml-2 text-[11px]"
                        style={{ color: efectivo ? '#10b981' : 'var(--color-acero-oscuro)' }}
                      >
                        {efectivo ? 'Ve preventa' : 'Sin acceso'}
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function Campo({
  label,
  valor,
  onChange,
  tipo = 'text',
  ayuda,
}: {
  label: string
  valor: string
  onChange: (v: string) => void
  tipo?: string
  ayuda?: string
}) {
  return (
    <label className="block">
      <span className="text-xs block mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>{label}</span>
      <input
        type={tipo}
        value={valor}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded"
        style={{ border: '1px solid var(--color-acero-claro)', color: 'var(--foreground)' }}
      />
      {ayuda && (
        <span className="text-[11px] block mt-0.5" style={{ color: 'var(--color-acero-oscuro)' }}>{ayuda}</span>
      )}
    </label>
  )
}
