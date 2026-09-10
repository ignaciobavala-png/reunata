'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { EtapaContainer } from '@/lib/containers'

const RUTA = '/dashboard/admin/containers'

async function exigirInterno() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, ok: false as const, error: 'Sin sesión' }

  const { data: perfil } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
  const ok = perfil?.rol === 'master' || perfil?.rol === 'empleado'
  return { supabase, ok, error: ok ? undefined : 'No autorizado' }
}

export interface ViajeInput {
  nombre: string
  gesu_cuenta_id?: string | null
  gesu_token_env?: string | null
  descuento_china?: number
  descuento_oceano?: number
  fecha_cierre_china?: string | null
  fecha_embarque?: string | null
  fecha_arribo_est?: string | null
  fecha_liberacion?: string | null
  cotizacion_congelada?: number | null
  notas?: string | null
}

export async function crearViaje(input: ViajeInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { supabase, ok, error } = await exigirInterno()
  if (!ok) return { ok: false, error }

  const { data, error: err } = await supabase
    .from('containers')
    .insert({ ...limpiar(input), etapa: 'borrador' })
    .select('id')
    .single()

  if (err) return { ok: false, error: err.message }
  revalidatePath(RUTA)
  return { ok: true, id: data.id as string }
}

export async function actualizarViaje(id: string, input: ViajeInput): Promise<{ ok: boolean; error?: string }> {
  const { supabase, ok, error } = await exigirInterno()
  if (!ok) return { ok: false, error }

  const { error: err } = await supabase.from('containers').update(limpiar(input)).eq('id', id)
  if (err) return { ok: false, error: err.message }
  revalidatePath(RUTA)
  return { ok: true }
}

/**
 * La etapa la avanza una persona, nunca el calendario ni la API: si el barco se
 * demora, el sistema no puede decir "llegó" solo. Por eso esto es una acción
 * explícita del panel y no un cron que mire `fecha_arribo_est`.
 */
export async function cambiarEtapa(id: string, etapa: EtapaContainer): Promise<{ ok: boolean; error?: string }> {
  const { supabase, ok, error } = await exigirInterno()
  if (!ok) return { ok: false, error }

  const { error: err } = await supabase.from('containers').update({ etapa }).eq('id', id)
  if (err) return { ok: false, error: err.message }
  revalidatePath(RUTA)
  return { ok: true }
}

/**
 * Carga de ítems pegando la planilla del proveedor.
 *
 * La proforma de China ya viene en Excel, así que la carga real es pegar columnas,
 * no tipear 200 filas a mano. Formato por línea, separado por tabs o punto y coma:
 *
 *     codigo   color   cantidad
 *
 * El color es opcional (producto sin variantes). El título y el producto_id salen
 * de `productos` por codigo_interno — es la misma mercadería que la tienda ya
 * conoce, con el mismo código.
 */
export async function importarItems(
  containerId: string,
  texto: string,
): Promise<{ ok: boolean; importados?: number; sinProducto?: string[]; error?: string }> {
  const { ok, error } = await exigirInterno()
  if (!ok) return { ok: false, error }

  const filas = texto
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => l.split(/\t|;|,(?=\s*\S)/).map(c => c.trim()))
    .filter(cols => cols.length >= 2)

  if (filas.length === 0) return { ok: false, error: 'No se reconoció ninguna fila.' }

  const service = createServiceClient()
  const codigos = [...new Set(filas.map(c => c[0]).filter(Boolean))]

  const { data: productos } = await service
    .from('productos')
    .select('id, codigo_interno, titulo')
    .in('codigo_interno', codigos)

  const porCodigo = new Map((productos ?? []).map(p => [p.codigo_interno as string, p]))
  const sinProducto: string[] = []
  const rows = []

  for (const cols of filas) {
    const codigo = cols[0]
    // Dos columnas = codigo + cantidad (sin color). Tres o más = codigo + color + cantidad.
    const conColor = cols.length >= 3
    const variante = conColor ? (cols[1] || null) : null
    const cantidad = parseInt(conColor ? cols[2] : cols[1], 10)

    if (!codigo || isNaN(cantidad) || cantidad < 0) continue

    const prod = porCodigo.get(codigo)
    if (!prod) {
      sinProducto.push(codigo)
      continue
    }

    rows.push({
      container_id: containerId,
      producto_id: prod.id,
      codigo_interno: codigo,
      titulo: prod.titulo,
      variante: variante ? variante.toUpperCase() : null,
      cantidad,
    })
  }

  if (rows.length === 0) {
    return { ok: false, error: 'Ninguna fila coincidió con un producto del catálogo.', sinProducto }
  }

  // onConflict tiene que matchear el índice único real (container_id, codigo_interno,
  // coalesce(variante,'')). Como es un índice de expresión, PostgREST no puede
  // apuntarle: se resuelve borrando y reinsertando el juego de ítems del viaje que
  // vienen en esta importación.
  const { error: errDel } = await service
    .from('container_items')
    .delete()
    .eq('container_id', containerId)
    .in('codigo_interno', [...new Set(rows.map(r => r.codigo_interno))])
    .eq('comprometido', 0)

  if (errDel) return { ok: false, error: errDel.message }

  const { error: errIns } = await service.from('container_items').insert(rows)
  if (errIns) return { ok: false, error: errIns.message }

  revalidatePath(RUTA)
  return { ok: true, importados: rows.length, sinProducto: [...new Set(sinProducto)] }
}

/**
 * Alta de ítems eligiendo del catálogo.
 *
 * Es la forma real de cargar un viaje: el catálogo entero son ~171 artículos y
 * Gastón trae cosas que YA vende, así que elige de lo que tiene en pantalla en vez
 * de traducir los códigos del proveedor chino a los internos. El importador de
 * planilla queda para el caso de una lista larga.
 *
 * Si el color ya estaba en el viaje se le suma la cantidad, no se pisa: cargar dos
 * veces el mismo producto es sumar lo que se trae, no corregir un tipeo.
 */
export async function agregarDesdeCatalogo(
  containerId: string,
  productoId: number,
  lineas: { variante: string | null; cantidad: number }[],
): Promise<{ ok: boolean; agregados?: number; error?: string }> {
  const { ok, error } = await exigirInterno()
  if (!ok) return { ok: false, error }

  const limpias = lineas.filter(l => Number.isInteger(l.cantidad) && l.cantidad > 0)
  if (limpias.length === 0) return { ok: false, error: 'No pusiste ninguna cantidad.' }

  const service = createServiceClient()

  const { data: prod } = await service
    .from('productos')
    .select('id, codigo_interno, titulo')
    .eq('id', productoId)
    .single()

  if (!prod?.codigo_interno) return { ok: false, error: 'El producto no tiene código interno.' }

  const { data: existentes } = await service
    .from('container_items')
    .select('id, variante, cantidad')
    .eq('container_id', containerId)
    .eq('codigo_interno', prod.codigo_interno)

  for (const linea of limpias) {
    const previo = (existentes ?? []).find(e => (e.variante ?? null) === linea.variante)

    if (previo) {
      const { error: errUpd } = await service
        .from('container_items')
        .update({ cantidad: (previo.cantidad as number) + linea.cantidad })
        .eq('id', previo.id)
      if (errUpd) return { ok: false, error: errUpd.message }
    } else {
      const { error: errIns } = await service.from('container_items').insert({
        container_id: containerId,
        producto_id: prod.id,
        codigo_interno: prod.codigo_interno,
        titulo: prod.titulo,
        variante: linea.variante,
        cantidad: linea.cantidad,
      })
      if (errIns) return { ok: false, error: errIns.message }
    }
  }

  revalidatePath(RUTA)
  return { ok: true, agregados: limpias.length }
}

export async function borrarItem(itemId: number): Promise<{ ok: boolean; error?: string }> {
  const { supabase, ok, error } = await exigirInterno()
  if (!ok) return { ok: false, error }

  // Un ítem con reservas encima no se borra: dejaría la reserva del cliente
  // apuntando al vacío.
  const { data: item } = await supabase
    .from('container_items')
    .select('comprometido')
    .eq('id', itemId)
    .single()

  if ((item?.comprometido ?? 0) > 0) {
    return { ok: false, error: 'Ese ítem ya tiene reservas. Cancelalas primero.' }
  }

  const { error: err } = await supabase.from('container_items').delete().eq('id', itemId)
  if (err) return { ok: false, error: err.message }
  revalidatePath(RUTA)
  return { ok: true }
}

export async function ajustarCantidadItem(itemId: number, cantidad: number): Promise<{ ok: boolean; error?: string }> {
  const { supabase, ok, error } = await exigirInterno()
  if (!ok) return { ok: false, error }
  if (!Number.isInteger(cantidad) || cantidad < 0) return { ok: false, error: 'Cantidad inválida' }

  const { error: err } = await supabase.from('container_items').update({ cantidad }).eq('id', itemId)
  // El check container_items_no_sobreventa rechaza bajar la cantidad por debajo de
  // lo ya comprometido: es exactamente lo que queremos que pase.
  if (err) return { ok: false, error: 'No podés dejar la cantidad por debajo de lo ya reservado.' }
  revalidatePath(RUTA)
  return { ok: true }
}

/**
 * Permiso de preventa por usuario.
 *
 * null = hereda del canal (canales.acceso_precompra). true/false = decisión
 * explícita sobre esa cuenta. Se guarda con service client porque el admin
 * escribe sobre el perfil de otro.
 */
export async function setPermisoContainers(
  profileId: string,
  valor: boolean | null,
): Promise<{ ok: boolean; error?: string }> {
  const { ok, error } = await exigirInterno()
  if (!ok) return { ok: false, error }

  const service = createServiceClient()
  const { error: err } = await service
    .from('profiles')
    .update({ containers_habilitado: valor })
    .eq('id', profileId)

  if (err) return { ok: false, error: err.message }
  revalidatePath(RUTA)
  return { ok: true }
}

/** Acuse de que Elena movió la mercadería de la cuenta del viaje a la principal. */
export async function marcarMovidaAGesu(reservaId: string, hecho: boolean): Promise<{ ok: boolean; error?: string }> {
  const { supabase, ok, error } = await exigirInterno()
  if (!ok) return { ok: false, error }

  const { error: err } = await supabase
    .from('container_reservas')
    .update({ movida_a_gesu_en: hecho ? new Date().toISOString() : null })
    .eq('id', reservaId)

  if (err) return { ok: false, error: err.message }
  revalidatePath(RUTA)
  return { ok: true }
}

/** Facturado y entregado son independientes: una reserva puede estar facturada y sin entregar 60 días. */
export async function marcarHito(
  reservaId: string,
  hito: 'facturada' | 'entregada',
  hecho: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, ok, error } = await exigirInterno()
  if (!ok) return { ok: false, error }

  const campo = hito === 'facturada' ? 'facturada_en' : 'entregada_en'
  const { error: err } = await supabase
    .from('container_reservas')
    .update({ [campo]: hecho ? new Date().toISOString() : null })
    .eq('id', reservaId)

  if (err) return { ok: false, error: err.message }
  revalidatePath(RUTA)
  return { ok: true }
}

export async function confirmarReserva(reservaId: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase, ok, error } = await exigirInterno()
  if (!ok) return { ok: false, error }

  const { error: err } = await supabase
    .from('container_reservas')
    .update({ estado: 'confirmada' })
    .eq('id', reservaId)

  if (err) return { ok: false, error: err.message }
  revalidatePath(RUTA)
  return { ok: true }
}

export async function cancelarReservaAdmin(reservaId: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase, ok, error } = await exigirInterno()
  if (!ok) return { ok: false, error }

  // Pasa por la función para que devuelva el comprometido: si se cancelara con un
  // update directo, la mercadería quedaría bloqueada para siempre.
  const { error: err } = await supabase.rpc('container_cancelar_reserva', { p_reserva_id: reservaId })
  if (err) return { ok: false, error: err.message }
  revalidatePath(RUTA)
  return { ok: true }
}

function limpiar(input: ViajeInput) {
  const salida: Record<string, unknown> = { nombre: input.nombre?.trim() }
  const opcionales: (keyof ViajeInput)[] = [
    'gesu_cuenta_id', 'gesu_token_env', 'descuento_china', 'descuento_oceano',
    'fecha_cierre_china', 'fecha_embarque', 'fecha_arribo_est', 'fecha_liberacion',
    'cotizacion_congelada', 'notas',
  ]
  for (const k of opcionales) {
    const v = input[k]
    if (v === undefined) continue
    salida[k] = v === '' ? null : v
  }
  return salida
}
