'use client'

import { useMemo, useState } from 'react'
import { AddToCartButton } from './AddToCartButton'
import { ColorPicker, type Variante } from './ColorPicker'
import { OpcionesDeCompra, useDisponibilidadContainers } from './CuandoViene'
import type { ViajeDisponible } from '@/lib/containers'

type Producto = React.ComponentProps<typeof AddToCartButton>['producto']

const mismoColor = (a: string | null | undefined, b: string | null | undefined) =>
  (a ?? '').trim().toUpperCase() === (b ?? '').trim().toUpperCase()

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--color-acero-claro)' }}>
      <p className="text-[10px] tracking-[0.25em] uppercase mb-4" style={{ color: 'var(--color-acero-oscuro)' }}>
        {titulo}
      </p>
      {children}
    </div>
  )
}

/**
 * Bloque de compra de la ficha: modelo → entrega inmediata → fechas aproximadas.
 *
 * Pedido de Gastón (24/09/2026, vía el tester): "lo primero que se debería marcar
 * es el tipo de modelo", y según el modelo "se le habiliten los contenedores
 * disponibles, únicamente con su fecha de arribo y el precio". Antes había dos
 * selectores de color independientes —el de "comprar ya" y uno por cada barco— y
 * el cliente tenía que volver a elegir el color en la preventa.
 *
 * Ahora hay UN selector que gobierna todo. Un producto que no viene en ningún
 * contenedor queda exactamente como antes: selector + stepper + botón, sin títulos.
 *
 * La disponibilidad de preventa se pide en el cliente (ver
 * `useDisponibilidadContainers`): el permiso lo resuelve el endpoint, y la ficha
 * sigue siendo una sola página para todos.
 */
export function FichaCompra({
  producto,
  esMayorista,
  fotoUrl,
}: {
  producto: Producto
  esMayorista: boolean
  /** Foto chica para la línea del carrito de preventa. */
  fotoUrl: string | null
}) {
  const { porCodigo } = useDisponibilidadContainers([producto.codigo_interno])
  const viajes = useMemo(() => porCodigo[producto.codigo_interno] ?? [], [porCodigo, producto.codigo_interno])
  const [variante, setVariante] = useState<string | null>(null)

  // Los colores del selector: los de la tienda más los que solo trae un barco.
  // Se puede elegir un color si hay stock hoy o si algún viaje lo tiene disponible
  // — agotado en la tienda no significa agotado para reservar.
  const { opciones, habilitados } = useMemo(() => {
    const opciones: Variante[] = [...(producto.variantes ?? [])]
    const habilitados = new Set(opciones.filter(v => v.stock > 0).map(v => v.nombre))
    for (const viaje of viajes) {
      for (const c of viaje.colores) {
        if (!c.variante) continue
        let opcion = opciones.find(o => mismoColor(o.nombre, c.variante))
        if (!opcion) {
          opcion = { nombre: c.variante, stock: 0 }
          opciones.push(opcion)
        }
        if (viaje.aceptaReservas && c.disponible > 0) habilitados.add(opcion.nombre)
      }
    }
    return { opciones, habilitados }
  }, [producto.variantes, viajes])

  const tieneModelos = opciones.length > 0
  const esperandoModelo = tieneModelos && !variante

  // Con un modelo elegido, cada viaje queda con ese color solo; los viajes que no
  // lo traen desaparecen. Los viajes sin acceso (colores vacío a propósito) se
  // muestran igual: son la invitación a pedir acceso, no dependen del color.
  const viajesVisibles = useMemo((): ViajeDisponible[] => {
    if (!tieneModelos || !variante) return viajes
    return viajes.flatMap(v => {
      if (v.requiereAcceso) return [v]
      // Un ítem del barco sin variante (surtido, o cargado sin color) vale para
      // cualquier modelo: no se esconde al elegir uno.
      const colores = v.colores.filter(c => c.variante == null || mismoColor(c.variante, variante))
      return colores.length > 0 ? [{ ...v, colores }] : []
    })
  }, [viajes, variante, tieneModelos])

  // Solo con preventa hacen falta los títulos: sin barcos la ficha es la de siempre.
  const conPreventa = viajes.length > 0
  // El carrito de la tienda solo conoce las variantes de la tienda: un color que
  // viene solo en un barco no se puede comprar con entrega inmediata.
  const varianteTienda = producto.variantes?.find(v => mismoColor(v.nombre, variante))?.nombre ?? null

  const soloEnBarco = !!variante && (producto.variantes?.length ?? 0) > 0 && !varianteTienda
  const compraInmediata = soloEnBarco ? (
    <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
      Este color no está disponible para entrega inmediata.
    </p>
  ) : (
    <AddToCartButton
      producto={producto}
      variante={tieneModelos ? varianteTienda : undefined}
    />
  )

  return (
    <>
      {tieneModelos && (
        <div className="mt-6">
          <ColorPicker
            variantes={opciones}
            selected={variante}
            onSelect={setVariante}
            habilitada={v => habilitados.has(v.nombre)}
          />
        </div>
      )}

      {conPreventa ? (
        <>
          <Seccion titulo="Entrega inmediata">{compraInmediata}</Seccion>
          {viajesVisibles.length > 0 ? (
            <Seccion titulo="Fechas aproximadas">
              <OpcionesDeCompra
                titulo={producto.titulo}
                viajes={viajesVisibles}
                codigoInterno={producto.codigo_interno}
                esMayorista={esMayorista}
                fotoUrl={fotoUrl}
                claveReset={`${producto.codigo_interno}:${variante ?? ''}`}
                modoFicha
                esperandoModelo={esperandoModelo}
              />
            </Seccion>
          ) : (
            <Seccion titulo="Fechas aproximadas">
              <p className="text-xs" style={{ color: 'var(--color-acero-oscuro)' }}>
                Este color no viene en ningún contenedor próximo.
              </p>
            </Seccion>
          )}
        </>
      ) : (
        <div className={tieneModelos ? 'mt-4' : 'mt-6'}>{compraInmediata}</div>
      )}
    </>
  )
}
