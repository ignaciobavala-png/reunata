'use client'

import { useCallback, useEffect, useState } from 'react'
import { Ship, X, Minus, Plus, Check } from 'lucide-react'
import { formatPrecio } from '@/lib/utils'
import { getSwatchStyle, capitalizeVariante } from '@/lib/variantes'
import { useCartStore } from '@/stores/cartStore'
import {
  ETAPA_COLOR,
  etiquetaLlegada,
  formatFechaEstimada,
  type DisponibilidadPorCodigo,
  type TiendaDisponible,
  type TiendaPorCodigo,
  type ViajeDisponible,
} from '@/lib/containers'

interface Disponibilidad {
  porCodigo: DisponibilidadPorCodigo
  /** La opción de stock (precio web, entrega inmediata) de cada código. */
  tienda: TiendaPorCodigo
}

const VACIO: Disponibilidad = { porCodigo: {}, tienda: {} }

/**
 * Disponibilidad de preventa para los códigos que hay en pantalla.
 *
 * El permiso lo resuelve el endpoint, no el caller: una grilla nueva que use este
 * hook queda protegida sola. Si el usuario no tiene acceso, vuelve vacío y el
 * badge no se dibuja en ninguna card.
 *
 * `activo` NO es una segunda barrera de permiso — es para no gastar un request por
 * grilla en el visitante anónimo, que es la mayoría del tráfico del catálogo
 * público y nunca va a tener preventa. Default true a propósito: una grilla que se
 * olvide de pasarlo funciona igual, solo pega de más. Quien decide sigue siendo el
 * endpoint.
 */
export function useDisponibilidadContainers(codigos: string[], activo = true) {
  const [datos, setDatos] = useState<Disponibilidad>(VACIO)
  const clave = codigos.filter(Boolean).sort().join(',')

  useEffect(() => {
    if (!activo || !clave) return
    let vivo = true
    fetch('/api/containers/disponibilidad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigos: clave.split(',') }),
    })
      .then(r => (r.ok ? r.json() : null))
      .then(json => {
        if (vivo && json?.porCodigo) {
          setDatos({ porCodigo: json.porCodigo, tienda: json.tienda ?? {} })
        }
      })
      .catch(() => {})
    return () => { vivo = false }
  }, [clave, activo])

  // Derivado, no un reset por efecto: si `activo` se apaga (logout sin recargar),
  // el badge desaparece en el mismo render en vez de quedar un tick con los datos
  // de la sesión anterior.
  return activo ? datos : VACIO
}

/** Badge fijo sobre la foto. Solo aparece si el producto viene en algún viaje. */
export function BadgeCuandoViene({
  viajes,
  onClick,
}: {
  viajes: ViajeDisponible[]
  onClick: () => void
}) {
  if (viajes.length === 0) return null
  const proximo = viajes[0]

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick() }}
      className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium transition-transform hover:scale-105"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(4px)',
        color: ETAPA_COLOR[proximo.etapa],
        border: `1px solid ${ETAPA_COLOR[proximo.etapa]}33`,
      }}
      aria-label={`Compra preventa — ${etiquetaLlegada(proximo.etapa, proximo.fechaArribo)}`}
    >
      <Ship size={12} strokeWidth={2} aria-hidden="true" />
      {etiquetaLlegada(proximo.etapa, proximo.fechaArribo)}
    </button>
  )
}

/**
 * El bloque de contenedores dentro de la ficha del producto.
 *
 * Es el pedido literal de la maqueta del tester (16/09/2026): el mismo artículo
 * con cuatro formas de comprarlo —hoy, o en alguno de los barcos— y las cuatro
 * agregables al carrito sin salir de la ficha.
 *
 * NO repite la fila "Precio web": en la ficha esa opción ya es el bloque principal
 * de arriba, con su precio grande, su selector de color y su botón. Mostrarla dos
 * veces obligaría al cliente a preguntarse cuál de las dos es la buena.
 *
 * Se pide en el cliente y no en el server para que la ficha siga siendo una sola
 * página para todos: la preventa la ve una minoría de cuentas habilitadas, y
 * resolverla en el server la haría privada para todo el mundo.
 */
export function CuandoVieneFicha({
  codigoInterno,
  titulo,
  estaLogueado,
  esMayorista = false,
  fotoUrl = null,
}: {
  codigoInterno: string
  titulo: string
  estaLogueado: boolean
  esMayorista?: boolean
  fotoUrl?: string | null
}) {
  const { porCodigo } = useDisponibilidadContainers([codigoInterno], estaLogueado)
  const viajes = porCodigo[codigoInterno] ?? []

  // Sin viajes no hay bloque: para el que no tiene permiso —que es casi todo el
  // mundo— la ficha queda exactamente como estaba.
  if (viajes.length === 0) return null

  return (
    <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--color-acero-claro)' }}>
      <div className="flex items-center gap-2 mb-1">
        <Ship size={14} style={{ color: 'var(--color-granito)' }} aria-hidden="true" />
        <p className="text-[10px] tracking-[0.25em] uppercase" style={{ color: 'var(--color-acero-oscuro)' }}>
          Importá con Reunata — Compra preventa
        </p>
      </div>
      <p className="text-xs mb-4" style={{ color: 'var(--color-acero-oscuro)' }}>
        Conseguí los productos que están por llegar en los próximos meses a un mejor precio.
      </p>

      <OpcionesDeCompra
        titulo={titulo}
        viajes={viajes}
        codigoInterno={codigoInterno}
        esMayorista={esMayorista}
        fotoUrl={fotoUrl}
        claveReset={codigoInterno}
      />
    </div>
  )
}

interface DrawerProps {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  viajes: ViajeDisponible[]
  /** La opción de stock: precio web, entrega inmediata. Va primera en la lista. */
  tienda?: TiendaDisponible
  codigoInterno?: string
  /** Mayorista ve neto en grande; minorista ve el final. */
  esMayorista?: boolean
  /** Foto de la card, para que la línea del carrito no salga en blanco. */
  fotoUrl?: string | null
}

/**
 * La lista de opciones de compra de un producto: la entrega inmediata y cada barco.
 *
 * Vive suelta —y no adentro del panel— porque se muestra en dos lugares: el drawer
 * que abre el badge de la grilla y la ficha del producto. Son la misma lista, con
 * el mismo estado y el mismo botón; lo único que cambia es el marco.
 */
function OpcionesDeCompra({
  titulo,
  viajes,
  tienda,
  codigoInterno = '',
  esMayorista = false,
  fotoUrl = null,
  claveReset,
  textoVacio = null,
}: {
  titulo: string
  viajes: ViajeDisponible[]
  tienda?: TiendaDisponible
  codigoInterno?: string
  esMayorista?: boolean
  fotoUrl?: string | null
  /** Cambiar este valor limpia las cantidades elegidas. */
  claveReset: string
  /** Qué decir cuando no hay ningún viaje. null = no decir nada. */
  textoVacio?: string | null
}) {
  const [cantidades, setCantidades] = useState<Record<number, number>>({})
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState<{ containerId: string; unidades: number } | null>(null)
  const addAlCarrito = useCartStore(s => s.add)
  const abrirCarrito = useCartStore(s => s.setCartOpen)

  // Al abrir otro producto (o al reabrir el panel) se limpia todo: si no, la
  // cantidad elegida para un mate queda puesta al abrir el siguiente.
  //
  // Se ajusta durante el render y no en un efecto: resetear con setState dentro de
  // un useEffect dispara un render en cascada y el panel llega a pintarse un frame
  // con los datos del producto anterior.
  const clave = claveReset
  const [duenoEstado, setDuenoEstado] = useState(clave)
  if (duenoEstado !== clave) {
    setDuenoEstado(clave)
    setCantidades({})
    setError(null)
    setListo(null)
  }

  // La cantidad se mueve de a bultos: el server rechaza cualquier cosa que no sea
  // múltiplo (mismo criterio que el checkout), así que los botones no pueden dejar
  // al cliente en un número que no va a poder reservar. El tope es el último bulto
  // entero que entra en lo disponible, no lo disponible a secas.
  const setCantidad = useCallback((itemId: number, valor: number, max: number, multiplo: number) => {
    const paso = Math.max(1, multiplo)
    const tope = Math.floor(max / paso) * paso
    const ajustado = Math.round(valor / paso) * paso
    setCantidades(prev => ({ ...prev, [itemId]: Math.max(0, Math.min(ajustado, tope)) }))
  }, [])

  /**
   * Agrega al carrito, no reserva.
   *
   * Decisión de Gastón (14/09/2026): un solo carrito y un solo pago, como un
   * pedido normal. La mercadería del viaje NO se bloquea acá — se bloquea recién
   * al confirmar el pedido, en la misma transacción que lo escribe
   * (`preventa_comprometer`). Mientras está en el carrito de alguien sigue
   * disponible para todos, igual que el stock de la tienda: bloquear al agregar
   * dejaría el barco vendido por carritos abandonados.
   *
   * `add` suma un bulto cuando el itemKey ya existe, así que N bultos se agregan
   * llamando N veces. Es la misma puerta que usa la card del catálogo y no hay
   * motivo para abrirle una segunda.
   */
  function handleAgregar(viaje: ViajeDisponible) {
    const elegidos = viaje.colores
      .map(c => ({ color: c, cantidad: cantidades[c.itemId] ?? 0 }))
      .filter(x => x.cantidad > 0)

    if (elegidos.length === 0) {
      setError('Elegí una cantidad antes de agregar.')
      return
    }

    setError(null)
    const paso = Math.max(1, viaje.multiplo ?? 1)
    let unidades = 0

    for (const { color, cantidad } of elegidos) {
      const item = {
        productoId: viaje.productoId,
        // El viaje va en la clave: el mismo mate de stock y el del Contenedor 3
        // son dos líneas, con precio y fecha distintos.
        itemKey: `${viaje.productoId}:${color.variante ?? ''}:c${color.itemId}`,
        codigo_interno: viaje.codigoInterno,
        titulo,
        precio: color.precio,
        multiplo: paso,
        foto_url: fotoUrl ?? null,
        variante: color.variante ?? undefined,
        // Tope del stepper del carrito: lo que queda en el barco, no el stock
        // de la tienda.
        stock: color.disponible,
        containerItemId: color.itemId,
        containerNombre: viaje.nombre,
        fechaEstimada: viaje.fechaArribo ?? undefined,
        descuentoEtapaPct: viaje.descuentoPct,
        precioLista: color.precioLista,
      }
      for (let i = 0; i < Math.floor(cantidad / paso); i++) addAlCarrito(item)
      unidades += cantidad
    }

    setListo({ containerId: viaje.containerId, unidades })
    setCantidades({})
    abrirCarrito(true)
  }

  return (
    <>
          {/* Primero la entrega inmediata: es la referencia contra la que se lee el
          descuento de cada barco. Mismo formato y mismo botón que los viajes —
          el cliente no elige "web o preventa", elige cuándo lo quiere. */}
      {tienda && (
        <OpcionTienda
          tienda={tienda}
          titulo={titulo}
          codigoInterno={codigoInterno}
          esMayorista={esMayorista}
          fotoUrl={fotoUrl}
          separador={false}
        />
      )}

      {viajes.length === 0 && textoVacio && (
        <p className="text-xs mt-6 pt-6 border-t" style={{ color: 'var(--color-acero-oscuro)', borderColor: 'var(--color-acero-claro)' }}>
          {textoVacio}
        </p>
      )}

      {viajes.map((viaje, i) => {
        const fecha = formatFechaEstimada(viaje.fechaArribo)
        const elegido = viaje.colores.reduce((acc, c) => acc + (cantidades[c.itemId] ?? 0), 0)
        const totalViaje = viaje.colores.reduce(
          (acc, c) => acc + (cantidades[c.itemId] ?? 0) * c.precio, 0,
        )
        const paso = Math.max(1, viaje.multiplo ?? 1)
        // Con bulto mínimo, "queda menos de un bulto" es lo mismo que no quedar:
        // el server no va a aceptar una cantidad que no sea múltiplo.
        const sinNada = viaje.colores.every(c => c.disponible < paso)

        return (
          <div
        key={viaje.containerId}
        className={i > 0 || tienda ? 'mt-6 pt-6 border-t' : ''}
        style={i > 0 || tienda ? { borderColor: 'var(--color-acero-claro)' } : undefined}
          >
        {/* La fecha es el encabezado del bloque, no un dato más abajo.
        Pedido del tester (17/09/2026): el cliente no ve el nombre del
        contenedor ni la etapa del barco —eso es nuestro—, así que sin la
        fecha dos viajes del mismo producto serían indistinguibles. */}
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: ETAPA_COLOR[viaje.etapa] }}
            aria-hidden="true"
          />
          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            {fecha ? <>Llega aprox. {fecha}</> : 'Fecha a confirmar'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-2">
          {viaje.descuentoPct > 0 && (
            <span className="text-xs inline-block px-2 py-0.5 rounded"
              style={{ background: 'var(--color-acero-brillo)', color: 'var(--color-granito-oscuro)' }}>
          −{viaje.descuentoPct}% por reservar ahora
            </span>
          )}
          {/* El precio de esta etapa sube todos los días hasta el de la web.
          Decirlo es la mitad del sentido de la etapa: el que espera,
          paga más. */}
          {viaje.pasoDiarioPct != null && viaje.descuentoPct > 0 && (
            <span className="text-xs inline-block px-2 py-0.5 rounded"
              style={{ background: 'var(--color-acero-claro)', color: 'var(--color-granito-oscuro)' }}>
          sube cada día
            </span>
          )}
          {paso > 1 && (
            <span className="text-xs inline-block px-2 py-0.5 rounded"
              style={{ background: 'var(--color-acero-claro)', color: 'var(--color-granito-oscuro)' }}>
          × {paso} u. mín.
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {viaje.colores.map(color => {
            const agotado = color.disponible <= 0
            const cant = cantidades[color.itemId] ?? 0
            const precioMostrado = esMayorista ? color.neto : color.precio
            return (
          <div
            key={color.itemId}
            className="flex items-center gap-2 py-1.5"
            style={{ opacity: agotado ? 0.45 : 1 }}
          >
            {color.variante ? (
              <span
            className="inline-block rounded flex-shrink-0"
            style={{
              width: 20, height: 20,
              ...getSwatchStyle(color.variante),
              border: '1px solid rgba(0,0,0,0.12)',
            }}
            aria-hidden="true"
              />
            ) : (
              <span className="w-5 flex-shrink-0" aria-hidden="true" />
            )}

            {/* Un modelo sin variantes no lleva nombre de color —no hay nada
            que elegir— y nunca decimos cuántas unidades trae el barco.
            Queda el spacer: la fila alinea precio y stepper a la derecha. */}
            <div className="min-w-0 flex-1">
              {color.variante && (
            <p className="text-xs truncate" style={{ color: 'var(--foreground)' }}>
              {capitalizeVariante(color.variante)}
            </p>
              )}
              {agotado && (
            <p className="text-[11px]" style={{ color: 'var(--color-acero-oscuro)' }}>
              Sin disponibilidad
            </p>
              )}
            </div>

            <div className="text-right flex-shrink-0">
              <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
            {formatPrecio(precioMostrado, viaje.moneda)}
              </p>
              {viaje.descuentoPct > 0 && (
            <p className="text-[11px] line-through" style={{ color: 'var(--color-acero-oscuro)' }}>
              {formatPrecio(esMayorista ? color.netoLista : color.precioLista, viaje.moneda)}
            </p>
              )}
            </div>

            {viaje.aceptaReservas && !agotado && (
              <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setCantidad(color.itemId, cant - paso, color.disponible, paso)}
              className="w-6 h-6 flex items-center justify-center rounded"
              style={{ border: '1px solid var(--color-acero-claro)' }}
              aria-label={`Quitar ${paso} de ${color.variante ?? 'este color'}`}
            >
              <Minus size={11} aria-hidden="true" />
            </button>
            <span className="w-6 text-center text-xs tabular-nums" style={{ color: 'var(--foreground)' }}>
              {cant}
            </span>
            <button
              onClick={() => setCantidad(color.itemId, cant + paso, color.disponible, paso)}
              className="w-6 h-6 flex items-center justify-center rounded"
              style={{ border: '1px solid var(--color-acero-claro)' }}
              aria-label={`Agregar ${paso} de ${color.variante ?? 'este color'}`}
            >
              <Plus size={11} aria-hidden="true" />
            </button>
              </div>
            )}
          </div>
            )
          })}
        </div>

        {listo?.containerId === viaje.containerId ? (
          <p className="mt-3 flex items-start gap-1.5 text-xs" style={{ color: '#10b981' }}>
            <Check size={13} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>
          <strong>{listo.unidades} u.</strong> agregadas al carrito
          {fecha ? <> · llegan aprox. el {fecha}</> : null}.
            </span>
          </p>
        ) : viaje.aceptaReservas && !sinNada ? (
          <button
            onClick={() => handleAgregar(viaje)}
            disabled={elegido === 0}
            className="mt-3 w-full py-2.5 text-xs tracking-widest uppercase transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--color-granito-oscuro)', color: 'white' }}
          >
            {elegido === 0
          ? 'Elegí una cantidad'
          : `Agregar ${elegido} u. · ${formatPrecio(totalViaje, viaje.moneda)}`}
          </button>
        ) : (
          <p className="mt-3 text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
            {sinNada ? 'No queda nada de este viaje.' : 'Este viaje no está tomando pedidos.'}
          </p>
        )}
          </div>
        )
      })}

      {error && (
        <p className="mt-4 text-xs" style={{ color: '#ef4444' }} role="alert">
          {error}
        </p>
      )}
    </>
  )
}

export function CuandoVieneDrawer({
  abierto,
  onCerrar,
  titulo,
  viajes,
  tienda,
  codigoInterno = '',
  esMayorista = false,
  fotoUrl = null,
}: DrawerProps) {
  useEffect(() => {
    if (!abierto) return
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [abierto, onCerrar])

  return (
    <>
      {abierto && (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={onCerrar} aria-hidden="true" />
      )}

      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300 w-full sm:w-[400px]"
        style={{
          background: 'white',
          transform: abierto ? 'translateX(0)' : 'translateX(100%)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
        }}
        role="dialog"
        aria-modal={abierto}
        aria-label={`Cuándo viene ${titulo}`}
      >
        <div
          className="flex items-start justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-acero-claro)' }}
        >
          <div className="flex items-start gap-2 pr-3">
            <Ship size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-granito)' }} aria-hidden="true" />
            <div>
              <p className="text-sm font-medium leading-snug" style={{ color: 'var(--foreground)' }}>
                {titulo}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                Importá con Reunata — Compra preventa
              </p>
            </div>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar">
            <X size={16} aria-hidden="true" style={{ color: 'var(--color-acero-oscuro)' }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4" data-lenis-prevent>
          <OpcionesDeCompra
            titulo={titulo}
            viajes={viajes}
            tienda={tienda}
            codigoInterno={codigoInterno}
            esMayorista={esMayorista}
            fotoUrl={fotoUrl}
            claveReset={abierto ? titulo : ''}
            textoVacio="Este producto no viene en ningún viaje abierto."
          />
        </div>

        <div className="px-5 py-3 border-t" style={{ borderColor: 'var(--color-acero-claro)' }}>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-acero-oscuro)' }}>
            Se paga junto con el resto del carrito, en un solo pedido. Las fechas
            son estimadas y dependen del barco: cada producto muestra la suya y se
            despacha cuando llega.
          </p>
        </div>
      </div>
    </>
  )
}

/**
 * La opción de stock dentro del panel: precio de la web, entrega inmediata.
 *
 * Existe para que el cliente pueda comparar sin cerrar el panel. Tiene el mismo
 * formato que un viaje —color, disponible, precio, stepper y un botón— porque la
 * pregunta que contesta el panel es una sola: cuándo lo querés y cuánto sale.
 *
 * Maneja sus cantidades por su cuenta: las del panel están indexadas por
 * container_item_id, que acá no existe.
 */
function OpcionTienda({
  tienda,
  titulo,
  codigoInterno,
  esMayorista,
  fotoUrl,
  separador,
}: {
  tienda: TiendaDisponible
  titulo: string
  codigoInterno: string
  esMayorista: boolean
  fotoUrl: string | null
  separador: boolean
}) {
  const [cantidades, setCantidades] = useState<Record<string, number>>({})
  const [listo, setListo] = useState<number | null>(null)
  const addAlCarrito = useCartStore(s => s.add)
  const abrirCarrito = useCartStore(s => s.setCartOpen)

  const paso = Math.max(1, tienda.multiplo ?? 1)
  const elegido = Object.values(cantidades).reduce((a, b) => a + b, 0)
  const precioMostrado = esMayorista ? tienda.neto : tienda.precio
  const total = elegido * precioMostrado
  // stock null = sin control de stock: se vende igual.
  const sinNada = tienda.colores.every(c => c.stock != null && c.stock < paso)

  function setCantidad(clave: string, valor: number, max: number | null) {
    const tope = max != null ? Math.floor(max / paso) * paso : Infinity
    const ajustado = Math.round(valor / paso) * paso
    setCantidades(prev => ({ ...prev, [clave]: Math.max(0, Math.min(ajustado, tope)) }))
  }

  function agregar() {
    let unidades = 0
    for (const color of tienda.colores) {
      const clave = color.variante ?? ''
      const cantidad = cantidades[clave] ?? 0
      if (cantidad <= 0) continue
      const item = {
        productoId: tienda.productoId,
        // Sin sufijo de viaje: es la misma línea que agrega la card del catálogo,
        // así que agregar desde acá suma a la que ya esté en el carrito.
        itemKey: `${tienda.productoId}:${clave}`,
        codigo_interno: codigoInterno,
        titulo,
        precio: tienda.precio,
        multiplo: paso,
        foto_url: fotoUrl ?? null,
        variante: color.variante ?? undefined,
        stock: color.stock,
      }
      for (let i = 0; i < Math.floor(cantidad / paso); i++) addAlCarrito(item)
      unidades += cantidad
    }
    if (unidades === 0) return
    setListo(unidades)
    setCantidades({})
    abrirCarrito(true)
  }

  return (
    <div
      className={separador ? 'mt-6 pt-6 border-t' : ''}
      style={separador ? { borderColor: 'var(--color-acero-claro)' } : undefined}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: '#10b981' }}
          aria-hidden="true"
        />
        <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          Precio web
        </p>
        <span className="text-xs" style={{ color: '#10b981' }}>Entrega inmediata</span>
      </div>

      <p className="text-xs mt-1" style={{ color: 'var(--color-acero-oscuro)' }}>
        Lo que hay en depósito. Se despacha con el resto del pedido.
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {tienda.colores.map(color => {
          const clave = color.variante ?? ''
          const agotado = color.stock != null && color.stock <= 0
          const cant = cantidades[clave] ?? 0
          return (
            <div
              key={clave || 'unico'}
              className="flex items-center gap-2 py-1.5"
              style={{ opacity: agotado ? 0.45 : 1 }}
            >
              {color.variante ? (
                <span
                  className="inline-block rounded flex-shrink-0"
                  style={{
                    width: 20, height: 20,
                    ...getSwatchStyle(color.variante),
                    border: '1px solid rgba(0,0,0,0.12)',
                  }}
                  aria-hidden="true"
                />
              ) : (
                <span className="w-5 flex-shrink-0" aria-hidden="true" />
              )}

              <div className="min-w-0 flex-1">
                {/* Igual que en los viajes: un modelo sin variantes no lleva
                nombre de color. El stock sí queda —es el de la tienda, no la
                cantidad que trae un barco. */}
                {color.variante && (
                  <p className="text-xs truncate" style={{ color: 'var(--foreground)' }}>
                    {capitalizeVariante(color.variante)}
                  </p>
                )}
                <p className="text-[11px]" style={{ color: 'var(--color-acero-oscuro)' }}>
                  {agotado ? 'Sin stock' : color.stock != null ? `${color.stock} disponibles` : 'Disponible'}
                </p>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
                  {formatPrecio(precioMostrado)}
                </p>
              </div>

              {!agotado && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setCantidad(clave, cant - paso, color.stock)}
                    className="w-6 h-6 flex items-center justify-center rounded"
                    style={{ border: '1px solid var(--color-acero-claro)' }}
                    aria-label={`Quitar ${paso} de ${color.variante ?? 'este producto'}`}
                  >
                    <Minus size={11} aria-hidden="true" />
                  </button>
                  <span className="w-6 text-center text-xs tabular-nums" style={{ color: 'var(--foreground)' }}>
                    {cant}
                  </span>
                  <button
                    onClick={() => setCantidad(clave, cant + paso, color.stock)}
                    className="w-6 h-6 flex items-center justify-center rounded"
                    style={{ border: '1px solid var(--color-acero-claro)' }}
                    aria-label={`Agregar ${paso} de ${color.variante ?? 'este producto'}`}
                  >
                    <Plus size={11} aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {listo != null ? (
        <p className="mt-3 flex items-start gap-1.5 text-xs" style={{ color: '#10b981' }}>
          <Check size={13} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span><strong>{listo} u.</strong> agregadas al carrito · entrega inmediata.</span>
        </p>
      ) : sinNada ? (
        <p className="mt-3 text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
          Sin stock para entrega inmediata.
        </p>
      ) : (
        <button
          onClick={agregar}
          disabled={elegido === 0}
          className="mt-3 w-full py-2.5 text-xs tracking-widest uppercase transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--color-granito)', color: 'white' }}
        >
          {elegido === 0 ? 'Elegí una cantidad' : `Agregar ${elegido} u. · ${formatPrecio(total)}`}
        </button>
      )}
    </div>
  )
}
