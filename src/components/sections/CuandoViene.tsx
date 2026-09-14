'use client'

import { useCallback, useEffect, useState } from 'react'
import { Ship, X, Minus, Plus, Check } from 'lucide-react'
import { formatPrecio } from '@/lib/utils'
import { getSwatchStyle, capitalizeVariante } from '@/lib/variantes'
import { reservarContainer } from '@/app/actions/containers'
import {
  ETAPA_LABEL,
  ETAPA_AYUDA,
  ETAPA_COLOR,
  etiquetaLlegada,
  formatFechaEstimada,
  type DisponibilidadPorCodigo,
  type ViajeDisponible,
} from '@/lib/containers'

const VACIO: DisponibilidadPorCodigo = {}

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
  const [porCodigo, setPorCodigo] = useState<DisponibilidadPorCodigo>({})
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
      .then(json => { if (vivo && json?.porCodigo) setPorCodigo(json.porCodigo) })
      .catch(() => {})
    return () => { vivo = false }
  }, [clave, activo])

  // Derivado, no un reset por efecto: si `activo` se apaga (logout sin recargar),
  // el badge desaparece en el mismo render en vez de quedar un tick con los datos
  // de la sesión anterior.
  return activo ? porCodigo : VACIO
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
      aria-label={`¿Cuándo viene? — ${ETAPA_LABEL[proximo.etapa]}`}
    >
      <Ship size={12} strokeWidth={2} aria-hidden="true" />
      {etiquetaLlegada(proximo.etapa, proximo.fechaArribo)}
    </button>
  )
}

interface DrawerProps {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  viajes: ViajeDisponible[]
  /** Mayorista ve neto en grande; minorista ve el final. */
  esMayorista?: boolean
}

export function CuandoVieneDrawer({ abierto, onCerrar, titulo, viajes, esMayorista = false }: DrawerProps) {
  const [cantidades, setCantidades] = useState<Record<number, number>>({})
  const [enviando, setEnviando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState<{ containerId: string; numero?: number } | null>(null)

  // Al abrir otro producto (o al reabrir el panel) se limpia todo: si no, la
  // cantidad elegida para un mate queda puesta al abrir el siguiente.
  //
  // Se ajusta durante el render y no en un efecto: resetear con setState dentro de
  // un useEffect dispara un render en cascada y el panel llega a pintarse un frame
  // con los datos del producto anterior.
  const clave = abierto ? titulo : ''
  const [duenoEstado, setDuenoEstado] = useState(clave)
  if (duenoEstado !== clave) {
    setDuenoEstado(clave)
    setCantidades({})
    setError(null)
    setListo(null)
  }

  useEffect(() => {
    if (!abierto) return
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [abierto, onCerrar])

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

  async function handleReservar(viaje: ViajeDisponible) {
    const items = viaje.colores
      .map(c => ({ itemId: c.itemId, cantidad: cantidades[c.itemId] ?? 0 }))
      .filter(i => i.cantidad > 0)

    if (items.length === 0) {
      setError('Elegí una cantidad antes de reservar.')
      return
    }

    setEnviando(viaje.containerId)
    setError(null)
    const res = await reservarContainer(viaje.containerId, items)
    setEnviando(null)

    if (res.ok) {
      setListo({ containerId: viaje.containerId, numero: res.numero })
      setCantidades({})
    } else {
      setError(res.error ?? 'No se pudo registrar la reserva.')
    }
  }

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
                Preventa de importado
              </p>
            </div>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar">
            <X size={16} aria-hidden="true" style={{ color: 'var(--color-acero-oscuro)' }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4" data-lenis-prevent>
          {viajes.length === 0 && (
            <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
              Este producto no viene en ningún viaje abierto.
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
                className={i > 0 ? 'mt-6 pt-6 border-t' : ''}
                style={i > 0 ? { borderColor: 'var(--color-acero-claro)' } : undefined}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: ETAPA_COLOR[viaje.etapa] }}
                    aria-hidden="true"
                  />
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                    {viaje.nombre}
                  </p>
                  <span className="text-xs" style={{ color: ETAPA_COLOR[viaje.etapa] }}>
                    {ETAPA_LABEL[viaje.etapa]}
                  </span>
                </div>

                <p className="text-xs mt-1" style={{ color: 'var(--color-acero-oscuro)' }}>
                  {ETAPA_AYUDA[viaje.etapa]}
                </p>

                {fecha && (
                  <p className="text-xs mt-1" style={{ color: 'var(--foreground)' }}>
                    Llega aprox. <strong>{fecha}</strong>
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {viaje.descuentoPct > 0 && (
                    <span className="text-xs inline-block px-2 py-0.5 rounded"
                          style={{ background: 'var(--color-acero-brillo)', color: 'var(--color-granito-oscuro)' }}>
                      −{viaje.descuentoPct}% por reservar ahora
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

                        <div className="min-w-0 flex-1">
                          <p className="text-xs truncate" style={{ color: 'var(--foreground)' }}>
                            {color.variante ? capitalizeVariante(color.variante) : 'Único'}
                          </p>
                          <p className="text-[11px]" style={{ color: 'var(--color-acero-oscuro)' }}>
                            {agotado ? 'Sin disponibilidad' : `${color.disponible} disponibles`}
                          </p>
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
                      {listo.numero ? <>Reserva <strong>#{listo.numero}</strong> registrada. </> : 'Reserva registrada. '}
                      Te vamos a contactar para confirmarla.
                    </span>
                  </p>
                ) : viaje.aceptaReservas && !sinNada ? (
                  <button
                    onClick={() => handleReservar(viaje)}
                    disabled={enviando === viaje.containerId || elegido === 0}
                    className="mt-3 w-full py-2.5 text-xs tracking-widest uppercase transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'var(--color-granito-oscuro)', color: 'white' }}
                  >
                    {enviando === viaje.containerId
                      ? 'Reservando…'
                      : elegido === 0
                        ? 'Elegí una cantidad'
                        : `Reservar ${elegido} u. · ${formatPrecio(totalViaje, viaje.moneda)}`}
                  </button>
                ) : (
                  <p className="mt-3 text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                    {sinNada ? 'No queda nada de este viaje.' : 'Este viaje no está tomando reservas.'}
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
        </div>

        <div className="px-5 py-3 border-t" style={{ borderColor: 'var(--color-acero-claro)' }}>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-acero-oscuro)' }}>
            Las fechas son estimadas y dependen del barco. Reservar no genera cobro
            automático: el equipo te contacta para confirmar la operación.
          </p>
        </div>
      </div>
    </>
  )
}
