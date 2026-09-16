'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { aplicarTipoCambio } from '@/lib/utils'
import { stockDisponible } from '@/lib/stock'
import { supabaseImg } from '@/lib/images'
import { ordenarFotos } from '@/lib/fotos'
import { crearEnvioEnviopack, consultarEnvioEnviopack, cotizarEnvio } from '@/lib/enviopack'
import { resolverTramoVolumen, type ConfigVolumen } from '@/lib/descuento-volumen'
import { ajusteMetodoPago, pctAjusteMetodoPago, netoDesdeBruto, totalMercaderiaConMetodo, esMetodoSinFactura } from '@/lib/iva'
import { notificarEstadoPedido } from '@/lib/emails/pedidos'
import { descuentoVigente, ETAPAS_VISIBLES, aceptaReservas, type EtapaContainer } from '@/lib/containers'
import { aplicarDescuento, combinarDescuentos, descuentoEtapaConPiso } from '@/lib/precio-efectivo'

interface LineaPedido {
  productoId: number
  cantidad: number
  variante?: string
  /**
   * Ítem del viaje del que sale la línea. Presente = preventa: no descuenta
   * stock de la tienda, lleva descuento de etapa y fecha estimada de arribo.
   * Ausente = mercadería de stock, se despacha ya.
   *
   * El precio NO viaja desde el navegador ni acá ni en la tienda: lo que se
   * acepta es qué ítem y cuánto.
   */
  containerItemId?: number
}

// Envío a domicilio para el canal Emprendedores — cotiza y se cobra siempre (sin
// envío gratis). El resto de los mayoristas coordina el envío con Elena desde el admin.
interface EnvioBorrador {
  provincia: string
  codigo_postal: string
  servicioId: string
  calle: string
  numero: string
  piso?: string
  referencia?: string
}

const METODO_NOTA: Record<string, string> = {
  efectivo:             'efectivo',
  transferencia_negro:  'transferencia',
  transferencia_blanco: 'transf. banco',
}

const ROLES_ADMIN = ['master', 'empleado']

async function verificarRolAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()
  return ROLES_ADMIN.includes(perfil?.rol ?? '')
}

// Espejo server-side de EstadoActions.tsx — mismas transiciones que ofrece la UI de admin.
// Server actions e RLS no deben confiar únicamente en que la UI oculte botones inválidos.
const TRANSICIONES_PERMITIDAS: Record<string, string[]> = {
  borrador:           ['pendiente_pago', 'cancelado'],
  pendiente_pago:     ['pago_confirmado', 'sena_confirmada', 'cancelado'],
  comprobante_subido: ['pago_confirmado', 'cancelado'],
  sena_confirmada:    ['pago_confirmado', 'cancelado'],
  pago_confirmado:    ['en_preparacion'],
  en_preparacion:     ['enviado'],
  enviado:            ['entregado'],
}

// Único lugar que decide editabilidad — no derivarla del label del estado en la UI.
// Hoy la única "edición" post-creación es subir un comprobante; deja de admitirla
// desde que el pago queda confirmado en adelante (incluido cancelado).
const ESTADOS_EDITABLES = ['borrador', 'pendiente_pago', 'comprobante_subido']

export async function crearPedidoBorrador(
  lineas: LineaPedido[],
  opciones?: { medioPago?: string; facturaIva?: boolean; comprobantePath?: string; pedidoIdToEdit?: string; envio?: EnvioBorrador },
): Promise<{ ok: boolean; pedidoId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const service = createServiceClient()

  // Edición in-place de un borrador propio: solo mientras siga en "borrador"
  // (una vez subido el comprobante, el pedido queda en revisión y no se toca más).
  if (opciones?.pedidoIdToEdit) {
    const { data: pedidoAEditar } = await service
      .from('pedidos')
      .select('cliente_id, estado')
      .eq('id', opciones.pedidoIdToEdit)
      .single()
    if (!pedidoAEditar || pedidoAEditar.cliente_id !== user.id) {
      return { ok: false, error: 'Pedido no encontrado.' }
    }
    if (pedidoAEditar.estado !== 'borrador') {
      return { ok: false, error: 'Este pedido ya no se puede editar.' }
    }
  }

  const { data: perfil } = await supabase
    .from('profiles')
    .select('aprobado, canal_id')
    .eq('id', user.id)
    .single()

  if (!perfil?.aprobado) return { ok: false, error: 'Tu cuenta aún no está aprobada para hacer pedidos.' }

  // Resolver lista de precios del canal del usuario
  const { data: canal } = await service
    .from('canales')
    .select('lista_precios, slug')
    .eq('id', perfil.canal_id)
    .single()

  const listaPrecio = canal?.lista_precios ?? 'precio_lista3'
  // El envío desde el carrito solo aplica al canal Emprendedores; ignorar el resto.
  const envioParams = canal?.slug === 'emprendedores' ? opciones?.envio : undefined

  const [{ data: productos }, { data: tcRow }, { data: canalConfig }, { count: pedidosCount }] = await Promise.all([
    service
      .from('productos')
      .select('id, precio_lista1, precio_lista2, precio_lista3, precio_lista4, precio_lista5, moneda, stock_visible, stock, variantes, iva')
      .in('id', lineas.map(l => l.productoId))
      .eq('activo', true),
    service
      .from('configuracion')
      .select('valor')
      .eq('clave', 'tipo_cambio_usd')
      .maybeSingle(),
    service
      .from('canales_config')
      .select('desc_autogestion_primera_pct, desc_autogestion_siguientes_pct, desc_efectivo_pct, desc_transferencia_pct, recargo_transf_blanco_pct, minimo_compra, piso_descuento_pct, desc_volumen_monto_min, desc_volumen_pct, desc_volumen_monto_min_2, desc_volumen_pct_2, desc_volumen_monto_min_3, desc_volumen_pct_3')
      .eq('canal_id', perfil.canal_id)
      .maybeSingle(),
    service
      .from('pedidos')
      .select('id', { count: 'exact', head: true })
      .eq('cliente_id', user.id)
      .neq('estado', 'cancelado'),
  ])

  if (!productos?.length) return { ok: false, error: 'Productos no disponibles.' }

  // Validar múltiplos contra producto_canales
  const { data: productoCanalDb } = await service
    .from('producto_canales')
    .select('producto_id, multiplo')
    .eq('canal_id', perfil.canal_id)
    .in('producto_id', lineas.map(l => l.productoId))

  for (const linea of lineas) {
    const row = productoCanalDb?.find(r => r.producto_id === linea.productoId)
    const multiplo = row?.multiplo ?? 1
    if (multiplo > 1 && linea.cantidad % multiplo !== 0) {
      return { ok: false, error: `La cantidad de un producto debe ser múltiplo de ${multiplo}.` }
    }
  }

  // Validar stock disponible — solo para las líneas de stock. La preventa no sale
  // del depósito: su disponibilidad es la del barco y se valida más abajo contra
  // container_items.
  for (const linea of lineas) {
    if (linea.containerItemId != null) continue
    const prod = productos.find(p => p.id === linea.productoId)
    if (prod) {
      const disponible = stockDisponible(prod, linea.variante)
      if (disponible !== null && disponible < linea.cantidad) {
        return { ok: false, error: `Stock insuficiente para el producto #${linea.productoId}. Disponible: ${disponible}.` }
      }
    }
  }

  // ── Preventa ────────────────────────────────────────────────────────────
  // Las líneas que vienen de un viaje se revalidan enteras acá: permiso, etapa,
  // pertenencia del ítem al producto y disponibilidad. Lo del navegador es solo
  // "este ítem, esta cantidad".
  const idsPreventa = [...new Set(
    lineas.map(l => l.containerItemId).filter((id): id is number => Number.isInteger(id)),
  )]

  type ItemViaje = {
    id: number
    producto_id: number | null
    variante: string | null
    cantidad: number
    comprometido: number
    precio_base: number | null
    containers: {
      id: string
      nombre: string
      etapa: EtapaContainer
      descuento_china: number
      descuento_oceano: number
      fecha_arribo_est: string | null
    }
  }
  const itemsViaje = new Map<number, ItemViaje>()

  if (idsPreventa.length > 0) {
    const { data: permiso } = await supabase.rpc('puede_containers')
    if (!permiso) {
      return { ok: false, error: 'Tu cuenta no tiene acceso a preventa de importados.' }
    }

    const { data: filas } = await service
      .from('container_items')
      .select(`
        id, producto_id, variante, cantidad, comprometido, precio_base,
        containers!inner ( id, nombre, etapa, descuento_china, descuento_oceano, fecha_arribo_est )
      `)
      .in('id', idsPreventa)
      .in('containers.etapa', ETAPAS_VISIBLES)

    for (const f of (filas ?? []) as unknown as ItemViaje[]) itemsViaje.set(f.id, f)

    if (itemsViaje.size !== idsPreventa.length) {
      return { ok: false, error: 'Alguno de los productos en preventa ya no está disponible. Actualizá el carrito.' }
    }

    // Lo pedido por ítem, sumado: dos líneas del mismo color (no debería pasar,
    // pero el carrito vive en localStorage) tienen que competir contra el mismo
    // disponible, no cada una por su lado.
    const pedidoPorItem = new Map<number, number>()
    for (const l of lineas) {
      if (l.containerItemId == null) continue
      pedidoPorItem.set(l.containerItemId, (pedidoPorItem.get(l.containerItemId) ?? 0) + l.cantidad)
    }

    for (const l of lineas) {
      if (l.containerItemId == null) continue
      const item = itemsViaje.get(l.containerItemId)!

      // Puerto son los 10 días de aduana: se ve, no se compra.
      if (!aceptaReservas(item.containers.etapa)) {
        return { ok: false, error: `"${item.containers.nombre}" ya no está tomando pedidos.` }
      }
      // El ítem tiene que ser del producto que dice la línea: si no, alguien
      // podría pagar el precio de un producto barato y llevarse otro.
      if (item.producto_id !== l.productoId) {
        return { ok: false, error: 'Los productos en preventa del carrito no coinciden. Actualizá el carrito.' }
      }
      const disponible = Math.max(item.cantidad - item.comprometido, 0)
      if (disponible < (pedidoPorItem.get(l.containerItemId) ?? 0)) {
        return { ok: false, error: `No queda suficiente de uno de los productos en preventa. Disponible: ${disponible}.` }
      }
    }
  }

  const tipoCambioUsd = parseFloat(tcRow?.valor ?? '1') || 1

  // Precio de lista del canal, en pesos. Es la misma base para stock y preventa:
  // el producto es el mismo, lo que cambia es cuándo llega y el descuento de etapa.
  const base = lineas.flatMap(l => {
    const prod = productos.find(p => p.id === l.productoId)
    if (!prod) return []
    const item = l.containerItemId != null ? itemsViaje.get(l.containerItemId) : undefined
    // El override de precio del viaje pisa la lista del canal cuando está cargado.
    const precioRaw = item?.precio_base != null
      ? Number(item.precio_base)
      : (prod[listaPrecio as keyof typeof prod] as number | null)
    if (!precioRaw) return []
    const { precio: precioArs } = aplicarTipoCambio(precioRaw, prod.moneda ?? null, tipoCambioUsd)
    if (precioArs === null) return []
    return [{
      productoId: l.productoId,
      cantidad: l.cantidad,
      precioLista: precioArs,
      ivaPct: (prod.iva as number | null) ?? null,
      variante: l.variante ?? null,
      containerItemId: l.containerItemId ?? null,
      // Bruto: todavía sin el piso del canal, que depende de la cascada y por eso
      // se resuelve abajo.
      descEtapaBruto: item ? descuentoVigente(item.containers) : 0,
      fechaEstimada: item?.containers.fecha_arribo_est ?? null,
    }]
  })

  if (base.length === 0) return { ok: false, error: 'Ningún producto tiene precio configurado.' }
  if (base.length !== lineas.length) {
    return { ok: false, error: 'Algunos productos de tu carrito ya no están disponibles. Quitalos del carrito para continuar.' }
  }

  // Resolver el precio de cada línea con el descuento de etapa ya recortado por el
  // piso del canal.
  //
  // Hay una circularidad real: el piso se mide contra la cascada del pedido, la
  // cascada depende del tramo de volumen, y el tramo depende del subtotal, que
  // depende del precio. Se corta con dos pasadas: la primera calcula la cascada
  // con el descuento de etapa entero, la segunda recorta y recalcula. Con el piso
  // en null (el default que pidió Gastón) la segunda pasada es idéntica a la
  // primera y esto no cambia ningún número.
  function resolverCon(pctCascada: number) {
    return base.map(b => {
      const descEtapa = b.containerItemId == null
        ? 0
        : descuentoEtapaConPiso(b.descEtapaBruto, pctCascada, canalConfig)
      return { ...b, descEtapa, precioUnit: aplicarDescuento(b.precioLista, descEtapa) }
    })
  }

  // Orden de descuentos (pedido del tester): 1) WEB (autogestión), 2) Volumen,
  // 3) forma de pago. Cada paso se aplica sobre el saldo del anterior.
  const esPrimeraCompra = (pedidosCount ?? 0) === 0
  const pctAutogestion = esPrimeraCompra
    ? (canalConfig?.desc_autogestion_primera_pct ?? 0)
    : (canalConfig?.desc_autogestion_siguientes_pct ?? 0)
  const medioPagoOriginal = opciones?.medioPago
  const pctMetodoPago = Math.abs(pctAjusteMetodoPago(medioPagoOriginal, canalConfig))

  type Resueltas = ReturnType<typeof resolverCon>
  function cascada(resueltas: Resueltas) {
    const subtotal = resueltas.reduce((acc, l) => acc + l.precioUnit * l.cantidad, 0)

    // Proporción neto/bruto del pedido — los precios de lista YA incluyen IVA
    // (ver lib/iva.ts). Sirve para cotizar los métodos sin factura sobre el neto.
    const subtotalNeto = resueltas.reduce(
      (acc, l) => acc + netoDesdeBruto(l.precioUnit, l.ivaPct) * l.cantidad, 0,
    )
    const factorNeto = subtotal > 0 ? subtotalNeto / subtotal : 1

    // 1) Descuento web (autogestión) — sobre el bruto, para que sea el más alto posible
    const ajusteAutogestion = pctAutogestion > 0 ? -Math.round(subtotal * pctAutogestion / 100) : 0
    const basePostAutogestion = subtotal + ajusteAutogestion

    // 2) Descuento por volumen — el umbral se evalúa sobre el bruto (calificás por lo
    // que comprás), pero el % se aplica sobre la base ya descontada por web.
    //
    // Decisión de Gastón (14/09/2026): la preventa SUMA para el umbral. El cliente
    // califica para el tramo con mercadería que llega en 60 días y se lleva el %
    // también sobre lo que se despacha hoy. Por eso `subtotal` es el del pedido
    // entero y no el de las líneas de stock.
    const tramoVol = resolverTramoVolumen(canalConfig as ConfigVolumen | null, subtotal)
    const ajusteVolumenCanal = tramoVol ? -Math.round(basePostAutogestion * tramoVol.pct / 100) : 0
    const basePostVolumenCanal = basePostAutogestion + ajusteVolumenCanal

    // 3) Descuento por método de pago — sobre el precio ya descontado por web y
    // volumen. Mismo helper que usa el carrito: cuando cada lado tenía su propia
    // cuenta, el carrito mostraba +21% en e-cheq/cheque y acá se guardaba sin él,
    // así que el cliente veía un total y quedaba registrado otro.
    //
    // Los métodos sin factura se cotizan sobre el neto (Total Bruto): sin factura
    // no hay IVA que cobrar.
    const ajusteMedioPago = ajusteMetodoPago(
      esMetodoSinFactura(medioPagoOriginal) ? Math.round(basePostVolumenCanal * factorNeto) : basePostVolumenCanal,
      medioPagoOriginal,
      canalConfig,
    )
    const totalMercaderia = totalMercaderiaConMetodo(basePostVolumenCanal, medioPagoOriginal, canalConfig, factorNeto)

    // El % combinado de la cascada, que es contra lo que se mide el piso de la
    // preventa. El método de pago entra solo si descuenta: el recargo de factura A
    // es IVA y sube el precio, no lo baja.
    const pctCascada = combinarDescuentos(
      pctAutogestion,
      tramoVol?.pct ?? 0,
      ajusteMedioPago < 0 ? pctMetodoPago : 0,
    )

    return { subtotal, factorNeto, ajusteVolumenCanal, tramoVol, ajusteMedioPago,
             basePostVolumenCanal, totalMercaderia, pctCascada }
  }

  // Pasada 1 con el descuento de etapa entero, pasada 2 con el piso ya aplicado.
  let lineasResueltas = resolverCon(0)
  let c = cascada(lineasResueltas)
  lineasResueltas = resolverCon(c.pctCascada)
  c = cascada(lineasResueltas)

  const { factorNeto, ajusteVolumenCanal, tramoVol,
          ajusteMedioPago, basePostVolumenCanal, totalMercaderia } = c

  // Validar mínimo de compra — sobre el Total Bruto (post desc. web/volumen),
  // sin el ajuste por forma de pago (pedido del tester, mismo criterio que el carrito)
  const minimoCompra = (canalConfig?.minimo_compra as number | null) ?? null
  if (minimoCompra && basePostVolumenCanal < minimoCompra) {
    return { ok: false, error: `El mínimo de compra es ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(minimoCompra)}.` }
  }

  // Envío (solo Emprendedores) — se cotiza server-side y se cobra siempre (sin envío
  // gratis). El costo del cliente nunca se confía: se recotiza acá contra Enviopack.
  let envioResuelto: { descripcion: string; costo: number } | null = null
  if (envioParams) {
    const { opciones: opcsEnvio, error: envioError } = await cotizarEnvio({
      items: lineas.map(l => ({ productoId: l.productoId, cantidad: l.cantidad })),
      codigo_postal: envioParams.codigo_postal,
      provincia: envioParams.provincia,
    })
    const opcion = opcsEnvio.find(o => o.id === envioParams.servicioId)
    if (envioError || !opcion) {
      return { ok: false, error: 'No se pudo verificar el costo de envío. Recalculá antes de continuar.' }
    }
    envioResuelto = { descripcion: opcion.descripcion, costo: opcion.costo }
  }

  const totalFinal = totalMercaderia + (envioResuelto?.costo ?? 0)

  const notaPartes: string[] = []
  if (pctAutogestion > 0) notaPartes.push(`Desc. Web ${pctAutogestion}%`)
  if (ajusteVolumenCanal !== 0 && tramoVol) notaPartes.push(`Desc. Vol ${tramoVol.pct}%`)
  // El IVA que NO se cobra por ir sin factura se anota con su % efectivo sobre el
  // subtotal, para que el desglose del pedido lo muestre como línea propia y no
  // quede escondido dentro del "Descuento total" (ver lib/desglose-pedido.ts).
  // Se guardan 4 decimales a propósito: el desglose reconstruye el MONTO a partir
  // de este %, y con 2 decimales (17,36% en vez de 17,3554%) la línea se iba $42
  // sobre un subtotal de $920.000 y el control del tester —restar la línea al
  // subtotal y comparar contra subtotal/1,21— no cerraba. La etiqueta se sigue
  // mostrando con 2 decimales.
  if (esMetodoSinFactura(medioPagoOriginal) && factorNeto < 1) {
    notaPartes.push(`Sin factura ${((1 - factorNeto) * 100).toFixed(4)}%`)
  }
  if (ajusteMedioPago !== 0) {
    notaPartes.push(`${ajusteMedioPago < 0 ? 'Desc.' : 'Recargo'} ${METODO_NOTA[medioPagoOriginal!] ?? medioPagoOriginal} ${pctMetodoPago}%`)
  }
  const descuento_sugerido = pctAutogestion > 0 ? pctAutogestion : null
  const descuento_nota = notaPartes.length > 0 ? notaPartes.join(', ') : null

  // Mapear transferencia_negro → transferencia_cueva para el DB (el canal config usa transferencia_negro como clave UI)
  const medioPagoDb = opciones?.medioPago === 'transferencia_negro'
    ? 'transferencia_cueva'
    : (opciones?.medioPago ?? null)

  const tieneComprobante = Boolean(opciones?.comprobantePath)
  const expiraEn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const camposPedido = {
    estado: tieneComprobante ? 'comprobante_subido' : 'borrador',
    total_usd: totalFinal,
    descuento_sugerido,
    descuento_nota,
    expira_en: expiraEn,
    ...(medioPagoDb ? { medio_pago: medioPagoDb } : {}),
    ...(opciones?.facturaIva !== undefined ? { factura_iva: opciones.facturaIva } : {}),
    ...(envioParams ? {
      costo_envio: envioResuelto?.costo ?? null,
      envio_descripcion: envioResuelto?.descripcion ?? null,
      envio_codigo_postal: envioParams.codigo_postal,
      envio_provincia: envioParams.provincia,
      envio_calle: envioParams.calle,
      envio_numero: envioParams.numero,
      envio_piso: envioParams.piso ?? null,
      envio_referencia: envioParams.referencia ?? null,
      envio_servicio: envioParams.servicioId,
    } : {}),
  }

  let pedidoId: string
  if (opciones?.pedidoIdToEdit) {
    pedidoId = opciones.pedidoIdToEdit
    const { error } = await service.from('pedidos').update(camposPedido).eq('id', pedidoId)
    if (error) return { ok: false, error: error.message }
    // Devolver al barco lo que este borrador tenía tomado ANTES de borrar sus
    // líneas: si no, editar un borrador dos veces deja el viaje bloqueado el
    // doble de lo que el cliente pidió, y nadie se entera hasta que el container
    // parece vendido sin estarlo.
    await service.rpc('preventa_liberar', { p_pedido_id: pedidoId })
    await service.from('pedido_items').delete().eq('pedido_id', pedidoId)
  } else {
    const { data: pedido, error } = await service
      .from('pedidos')
      .insert({ cliente_id: user.id, ...camposPedido })
      .select('id')
      .single()
    if (error || !pedido) return { ok: false, error: error?.message ?? 'Error creando pedido' }
    pedidoId = pedido.id
  }

  const { error: itemsError } = await service.from('pedido_items').insert(
    lineasResueltas.map(l => ({
      pedido_id: pedidoId,
      producto_id: l.productoId,
      cantidad: l.cantidad,
      precio_unit: l.precioUnit,
      variante: l.variante,
      container_item_id: l.containerItemId,
      // Copia congelada, no un join: si el barco se demora, el cliente tiene que
      // poder ver qué fecha le prometimos cuando compró.
      fecha_estimada: l.fechaEstimada,
      descuento_etapa_pct: l.descEtapa,
    }))
  )
  if (itemsError) {
    if (!opciones?.pedidoIdToEdit) await service.from('pedidos').delete().eq('id', pedidoId)
    return { ok: false, error: 'Error al registrar los ítems del pedido. Intentá de nuevo.' }
  }

  // Recién acá se bloquea la mercadería del barco, y en una sola transacción.
  // La validación de disponibilidad de más arriba es para dar un mensaje decente;
  // la que manda es esta, que toma el lock. Entre una y otra puede entrar otro
  // cliente, y si entró, este pedido se cae entero en vez de sobrevender.
  if (idsPreventa.length > 0) {
    const { error: comprometerError } = await service.rpc('preventa_comprometer', { p_pedido_id: pedidoId })
    if (comprometerError) {
      if (opciones?.pedidoIdToEdit) {
        await service.from('pedido_items').delete().eq('pedido_id', pedidoId)
      } else {
        await service.from('pedidos').delete().eq('id', pedidoId)
      }
      return { ok: false, error: comprometerError.message }
    }
  }

  if (tieneComprobante) {
    await service.from('comprobantes').insert({ pedido_id: pedidoId, url: opciones!.comprobantePath })
  }

  revalidatePath('/pedidos')
  revalidatePath(`/pedidos/${pedidoId}`)
  return { ok: true, pedidoId }
}

export async function subirComprobante(pedidoId: string, path: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const service = createServiceClient()

  const { data: pedido } = await service
    .from('pedidos')
    .select('cliente_id, estado')
    .eq('id', pedidoId)
    .single()

  if (!pedido || pedido.cliente_id !== user.id) throw new Error('Pedido no encontrado.')
  if (!['borrador', 'pendiente_pago'].includes(pedido.estado)) {
    throw new Error('Este pedido ya no admite un nuevo comprobante.')
  }

  await service.from('comprobantes').insert({ pedido_id: pedidoId, url: path })
  await service.from('pedidos').update({ estado: 'comprobante_subido' }).eq('id', pedidoId)
  revalidatePath(`/pedidos/${pedidoId}`)
}

export async function confirmarPago(pedidoId: string, medioPago: string, referencia?: string) {
  if (!await verificarRolAdmin()) throw new Error('Sin permisos.')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = createServiceClient()

  const { data: pedido } = await service
    .from('pedidos')
    .select('estado')
    .eq('id', pedidoId)
    .single()

  if (!pedido) throw new Error('Pedido no encontrado.')
  if (!(TRANSICIONES_PERMITIDAS[pedido.estado] ?? []).includes('pago_confirmado')) {
    throw new Error(`No se puede confirmar el pago desde el estado "${pedido.estado}".`)
  }

  await service.from('pedidos').update({
    estado: 'pago_confirmado',
    editable: false,
    medio_pago: medioPago,
    referencia_pago: referencia ?? null,
    pago_confirmado_por: user!.id,
    fecha_pago: new Date().toISOString(),
  }).eq('id', pedidoId)
  revalidatePath(`/dashboard/admin/pedidos`)
  revalidatePath(`/pedidos/${pedidoId}`)
}

// Genera el envío en Enviopack para un pedido y guarda el id/estado. Lo dispara
// Elena manualmente desde el detalle del pedido. No confirma el pago ni cambia el
// estado del pedido; solo crea el envío en Enviopack.
export async function generarEnvio(pedidoId: string): Promise<{ ok: boolean; error?: string }> {
  if (!await verificarRolAdmin()) return { ok: false, error: 'Sin permisos.' }

  const res = await crearEnvioEnviopack(pedidoId)
  if (!res.ok) return { ok: false, error: res.error }

  const service = createServiceClient()
  const { error } = await service.from('pedidos').update({
    enviopack_envio_id: res.envioId,
    enviopack_estado: res.estado,
    metodo_envio: 'enviopack',
  }).eq('id', pedidoId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/admin/pedidos')
  revalidatePath(`/dashboard/admin/pedidos/${pedidoId}`)
  return { ok: true }
}

// Marca con qué método se despacha el pedido, para el registro/conteo por canal.
// 'interno' lo elige Elena (moto, remís, retiro en local, otro correo); pasar null
// para deshacer. No se permite tocar el método si ya se generó un envío en Enviopack.
export async function marcarMetodoEnvio(
  pedidoId: string,
  metodo: 'interno' | null,
): Promise<{ ok: boolean; error?: string }> {
  if (!await verificarRolAdmin()) return { ok: false, error: 'Sin permisos.' }

  const service = createServiceClient()
  const { data: pedido } = await service
    .from('pedidos')
    .select('enviopack_envio_id')
    .eq('id', pedidoId)
    .single()
  if (pedido?.enviopack_envio_id) {
    return { ok: false, error: 'El pedido ya tiene un envío generado en Enviopack.' }
  }

  const { error } = await service
    .from('pedidos')
    .update({ metodo_envio: metodo })
    .eq('id', pedidoId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/admin/pedidos')
  revalidatePath(`/dashboard/admin/pedidos/${pedidoId}`)
  return { ok: true }
}

// Refresco manual del estado del envío en Enviopack — respaldo del webhook.
// Si el webhook falla o tarda, Elena puede actualizar a mano desde el pedido.
export async function actualizarEstadoEnvio(pedidoId: string): Promise<{ ok: boolean; estado?: string; error?: string }> {
  if (!await verificarRolAdmin()) return { ok: false, error: 'Sin permisos.' }

  const service = createServiceClient()
  const { data: pedido } = await service
    .from('pedidos')
    .select('enviopack_envio_id')
    .eq('id', pedidoId)
    .single()
  if (!pedido?.enviopack_envio_id) return { ok: false, error: 'El pedido no tiene envío generado.' }

  const envio = await consultarEnvioEnviopack(pedido.enviopack_envio_id)
  if (!envio.ok) return { ok: false, error: envio.error }

  const nuevoEstado = envio.procesado ? 'procesado' : envio.confirmado ? 'en_proceso' : 'sin_confirmar'
  const { error } = await service.from('pedidos').update({
    enviopack_estado: nuevoEstado,
    ...(envio.trackingNumber ? { tracking: envio.trackingNumber } : {}),
  }).eq('id', pedidoId)
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/dashboard/admin/pedidos/${pedidoId}`)
  return { ok: true, estado: nuevoEstado }
}

export async function actualizarEstadoPedido(pedidoId: string, estado: string) {
  if (!await verificarRolAdmin()) throw new Error('Sin permisos.')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = createServiceClient()

  const { data: pedidoActual } = await service
    .from('pedidos')
    .select('estado, medio_pago')
    .eq('id', pedidoId)
    .single()

  if (!pedidoActual) throw new Error('Pedido no encontrado.')

  const permitidos = TRANSICIONES_PERMITIDAS[pedidoActual.estado] ?? []
  if (!permitidos.includes(estado)) {
    throw new Error(`No se puede pasar de "${pedidoActual.estado}" a "${estado}".`)
  }
  if (estado === 'sena_confirmada' && pedidoActual.medio_pago !== 'efectivo') {
    throw new Error('La seña solo aplica a pedidos con medio de pago efectivo.')
  }

  const updates: Record<string, unknown> = { estado, editable: ESTADOS_EDITABLES.includes(estado) }
  if (estado === 'sena_confirmada') {
    updates.expira_en = null
  }
  if (estado === 'pago_confirmado') {
    updates.fecha_pago = new Date().toISOString()
    updates.expira_en = null
  }

  const { data: pedido } = await service
    .from('pedidos')
    .update(updates)
    .eq('id', pedidoId)
    .select('cliente_id')
    .single()

  // Cancelar devuelve al barco lo que el pedido tenía tomado. Sin esto, cada
  // pedido cancelado deja mercadería bloqueada para siempre y el viaje aparece
  // vendido sin estarlo — mismo criterio que container_cancelar_reserva.
  if (estado === 'cancelado') {
    await service.rpc('preventa_liberar', { p_pedido_id: pedidoId })
  }

  await service.from('pedido_estado_historial').insert({
    pedido_id: pedidoId,
    estado_anterior: pedidoActual.estado,
    estado_nuevo: estado,
    usuario_id: user?.id ?? null,
  })

  // Sincronizar última compra para recontacto (espejo del webhook de MP)
  if (estado === 'pago_confirmado' && pedido?.cliente_id) {
    await service
      .from('profiles')
      .update({ ultima_compra_en: new Date().toISOString(), requiere_recontacto: false })
      .eq('id', pedido.cliente_id)
  }

  await notificarEstadoPedido(pedidoId, estado)

  revalidatePath('/dashboard/admin/pedidos')
  revalidatePath(`/dashboard/admin/pedidos/${pedidoId}`)
  revalidatePath(`/pedidos/${pedidoId}`)
}

// ── Volver a pedir ──────────────────────────────────────────────────────────
// Devuelve los ítems de un pedido anterior con los datos DE HOY (precio según
// la lista del canal, stock, múltiplo). Lo que ya no está disponible se omite
// y se informa la cantidad para avisarle al cliente.

export interface ItemRecompra {
  productoId: number
  itemKey: string
  codigo_interno: string
  titulo: string
  precio: number
  cantidad: number
  multiplo: number
  foto_url: string | null
  variante?: string
  stock: number | null

  // Presentes solo si la línea salía de un viaje. Los consumidores pasan el ítem
  // entero al carrito, así que agregar un campo acá no obliga a tocarlos.
  containerItemId?: number
  containerNombre?: string
  fechaEstimada?: string
  descuentoEtapaPct?: number
  precioLista?: number
}

export async function getItemsParaRecomprar(
  pedidoId: string,
  /**
   * true cuando el pedido se está EDITANDO (borrador que vuelve al carrito), no
   * recomprando. Mientras el borrador existe, sus líneas ya tienen tomada la
   * mercadería del barco; al confirmar la edición se libera y se vuelve a tomar
   * (ver `preventa_liberar` más arriba). Sin este flag el cliente compite contra
   * su propia reserva: un borrador que se llevó todo el ítem se editaría con
   * cero disponible y la línea desaparecería.
   */
  editando = false,
): Promise<{ ok: true; items: ItemRecompra[]; omitidos: number } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Necesitás iniciar sesión.' }

  const service = createServiceClient()

  // El pedido debe ser del usuario — nunca recomprar pedidos ajenos
  const { data: pedido } = await service
    .from('pedidos')
    .select('id, cliente_id, pedido_items(producto_id, cantidad, variante, container_item_id)')
    .eq('id', pedidoId)
    .eq('cliente_id', user.id)
    .single()

  if (!pedido) return { ok: false, error: 'Pedido no encontrado.' }
  const lineasPedido = (pedido.pedido_items ?? []) as {
    producto_id: number; cantidad: number; variante: string | null; container_item_id: number | null
  }[]
  if (lineasPedido.length === 0) return { ok: false, error: 'El pedido no tiene productos.' }

  const { data: perfil } = await service
    .from('profiles')
    .select('canal_id')
    .eq('id', user.id)
    .single()
  const { data: canal } = await service
    .from('canales')
    .select('lista_precios')
    .eq('id', perfil?.canal_id ?? 0)
    .maybeSingle()

  const listaPrecio = canal?.lista_precios ?? 'precio_lista5'

  const ids = [...new Set(lineasPedido.map(l => l.producto_id))]
  const [{ data: productos }, { data: pcRows }, { data: tcRow }] = await Promise.all([
    service
      .from('productos')
      .select('id, titulo, codigo_interno, moneda, iva, stock, stock_visible, variantes, precio_lista1, precio_lista2, precio_lista3, precio_lista4, precio_lista5, producto_fotos(url, orden, destacada)')
      .in('id', ids)
      .eq('activo', true),
    service
      .from('producto_canales')
      .select('producto_id, multiplo')
      .eq('canal_id', perfil?.canal_id ?? 0)
      .in('producto_id', ids),
    service.from('configuracion').select('valor').eq('clave', 'tipo_cambio_usd').maybeSingle(),
  ])

  const tipoCambioUsd = parseFloat(tcRow?.valor ?? '1') || 1
  const multiplos: Record<number, number> = {}
  for (const r of pcRows ?? []) multiplos[r.producto_id] = r.multiplo ?? 1
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

  // ── Preventa ────────────────────────────────────────────────────────────
  // Las líneas que salen de un viaje NO se miden contra el stock del depósito:
  // la preventa es mercadería que todavía no llegó y su producto en la tienda
  // está casi siempre en cero, así que mirar ahí las omitía todas. Su disponible
  // es el del barco, y su precio lleva el descuento de la etapa vigente.
  const idsPreventa = [...new Set(
    lineasPedido.map(l => l.container_item_id).filter((id): id is number => Number.isInteger(id)),
  )]

  type ItemViaje = {
    id: number
    producto_id: number | null
    cantidad: number
    comprometido: number
    precio_base: number | null
    containers: {
      nombre: string
      etapa: EtapaContainer
      descuento_china: number
      descuento_oceano: number
      fecha_arribo_est: string | null
    }
  }
  const itemsViaje = new Map<number, ItemViaje>()

  if (idsPreventa.length > 0) {
    // Sin permiso el mapa queda vacío y las líneas de preventa se omiten, igual
    // que un producto que salió del canal: no se filtra precio de viaje a quien
    // no corresponde.
    const { data: permiso } = await supabase.rpc('puede_containers')
    if (permiso) {
      const { data: filas } = await service
        .from('container_items')
        .select(`
          id, producto_id, cantidad, comprometido, precio_base,
          containers!inner ( nombre, etapa, descuento_china, descuento_oceano, fecha_arribo_est )
        `)
        .in('id', idsPreventa)
        .in('containers.etapa', ETAPAS_VISIBLES)
      for (const f of (filas ?? []) as unknown as ItemViaje[]) itemsViaje.set(f.id, f)
    }
  }

  // Dos líneas del mismo ítem de viaje compiten contra el mismo disponible, no
  // cada una por su lado.
  const tomadoPorItem = new Map<number, number>()

  // Lo que este mismo pedido tiene tomado del barco. Al editar vuelve al pool
  // porque la edición lo libera; al recomprar no, porque el pedido original
  // sigue en pie.
  const propioPorItem = new Map<number, number>()
  if (editando) {
    for (const l of lineasPedido) {
      if (l.container_item_id == null) continue
      propioPorItem.set(l.container_item_id, (propioPorItem.get(l.container_item_id) ?? 0) + l.cantidad)
    }
  }

  const items: ItemRecompra[] = []
  let omitidos = 0

  for (const linea of lineasPedido) {
    const prod = productos?.find(p => p.id === linea.producto_id)
    // Producto inactivo, fuera del canal del usuario o sin precio para su lista → se omite
    if (!prod || !(linea.producto_id in multiplos)) { omitidos++; continue }

    const viaje = linea.container_item_id != null ? itemsViaje.get(linea.container_item_id) : undefined
    // Preventa cuyo viaje ya cerró, ya zarpó de la etapa que toma pedidos, o que
    // dejó de corresponder a este producto: no se puede volver a pedir.
    if (linea.container_item_id != null) {
      if (!viaje || !aceptaReservas(viaje.containers.etapa) || viaje.producto_id !== linea.producto_id) {
        omitidos++; continue
      }
    }

    // El override de precio del viaje pisa la lista del canal cuando está cargado.
    const precioRaw = viaje?.precio_base != null
      ? Number(viaje.precio_base)
      : (prod as Record<string, unknown>)[listaPrecio] as number | null
    if (precioRaw == null) { omitidos++; continue }
    const { precio: precioArs } = aplicarTipoCambio(precioRaw, prod.moneda ?? null, tipoCambioUsd)
    if (precioArs === null) { omitidos++; continue }
    // precio_lista5 (minorista) ya viene con IVA incluido y precio_lista3 (mayorista) es neto:
    // en ambos casos el precio de la lista se guarda tal cual, sin recargar IVA.
    const descuentoEtapaPct = viaje ? descuentoVigente(viaje.containers) : 0
    const precio = aplicarDescuento(precioArs, descuentoEtapaPct)

    const disponible = viaje
      ? Math.max(
          viaje.cantidad - viaje.comprometido
            + (propioPorItem.get(viaje.id) ?? 0)
            - (tomadoPorItem.get(viaje.id) ?? 0),
          0,
        )
      : stockDisponible(prod, linea.variante)
    const multiplo = multiplos[linea.producto_id] ?? 1
    // Cantidad del pedido original, ajustada al múltiplo vigente y al stock de hoy
    let cantidad = Math.ceil(linea.cantidad / multiplo) * multiplo
    if (disponible !== null) cantidad = Math.min(cantidad, Math.floor(disponible / multiplo) * multiplo)
    if (cantidad <= 0) { omitidos++; continue }
    if (viaje) tomadoPorItem.set(viaje.id, (tomadoPorItem.get(viaje.id) ?? 0) + cantidad)

    const fotos = ordenarFotos((prod.producto_fotos ?? []) as { url: string; orden: number; destacada: boolean }[])
    items.push({
      productoId: prod.id,
      // El viaje entra en la clave: el mismo producto de stock y el de un viaje
      // son dos líneas distintas del carrito, con precio y fecha distintos.
      itemKey: viaje
        ? `${prod.id}:${linea.variante ?? ''}:c${viaje.id}`
        : `${prod.id}:${linea.variante ?? ''}`,
      codigo_interno: prod.codigo_interno,
      titulo: prod.titulo,
      precio,
      cantidad,
      multiplo,
      foto_url: fotos[0]?.url ? supabaseImg(supabaseUrl, fotos[0].url, 200) : null,
      variante: linea.variante ?? undefined,
      stock: disponible,
      ...(viaje ? {
        containerItemId: viaje.id,
        containerNombre: viaje.containers.nombre,
        fechaEstimada: viaje.containers.fecha_arribo_est ?? undefined,
        descuentoEtapaPct,
        precioLista: Math.round(precioArs),
      } : {}),
    })
  }

  return { ok: true, items, omitidos }
}
