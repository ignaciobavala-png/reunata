'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getMPPreference, isSandbox } from '@/lib/mercadopago'
import { aplicarTipoCambio } from '@/lib/utils'
import { revalidatePath } from 'next/cache'
import { cotizarEnvio } from '@/lib/enviopack'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

interface CheckoutItem {
  productoId: number
  cantidad: number
}

interface GuestData {
  nombre: string
  email: string
  telefono?: string
}

interface EnvioParams {
  provincia: string
  codigo_postal: string
  servicioId: string
}

// Datos de envío resueltos server-side (nunca del cliente)
interface EnvioResuelto {
  descripcion: string
  costo: number
}

export async function iniciarCheckoutMP(
  items: CheckoutItem[],
  guestData?: GuestData,
  envioParams?: EnvioParams
): Promise<{ ok: boolean; init_point?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Usuarios registrados: solo consumidor_final puede pagar con MP
  if (user) {
    const { data: perfil } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (perfil?.rol !== 'consumidor_final') {
      return { ok: false, error: 'Este método de pago es solo para minoristas.' }
    }
  } else {
    // Guest: requiere datos del comprador
    if (!guestData?.nombre?.trim() || !guestData?.email?.trim()) {
      return { ok: false, error: 'Completá tu nombre y email para continuar.' }
    }
  }

  const service = createServiceClient()

  // Validar múltiplos — aplica tanto a usuarios registrados como a guests
  {
    let canalId: number | null = null

    if (user) {
      const { data: profileCanal } = await supabase
        .from('profiles')
        .select('canal_id')
        .eq('id', user.id)
        .single()
      canalId = profileCanal?.canal_id ?? null
    } else {
      // Guests operan como consumidor_final
      const { data: cfCanal } = await service
        .from('canales')
        .select('id')
        .eq('slug', 'consumidor_final')
        .single()
      canalId = cfCanal?.id ?? null
    }

    if (canalId) {
      const { data: multiplosDb } = await service
        .from('producto_canales')
        .select('producto_id, multiplo')
        .eq('canal_id', canalId)
        .in('producto_id', items.map(i => i.productoId))

      for (const item of items) {
        const row = multiplosDb?.find(r => r.producto_id === item.productoId)
        const multiplo = row?.multiplo ?? 1
        if (multiplo > 1 && item.cantidad % multiplo !== 0) {
          return { ok: false, error: `La cantidad de un producto debe ser múltiplo de ${multiplo}.` }
        }
      }
    }
  }

  const [{ data: productos }, { data: tcRow }] = await Promise.all([
    service
      .from('productos')
      .select('id, titulo, precio_lista5, moneda, stock_visible, stock')
      .in('id', items.map(i => i.productoId))
      .eq('activo', true),
    service
      .from('configuracion')
      .select('valor')
      .eq('clave', 'tipo_cambio_usd')
      .maybeSingle(),
  ])

  if (!productos?.length) return { ok: false, error: 'Productos no disponibles.' }

  for (const item of items) {
    const prod = productos.find(p => p.id === item.productoId)
    if (prod) {
      const stockDisponible = prod.stock_visible ?? prod.stock
      if (stockDisponible !== null && stockDisponible < item.cantidad) {
        return { ok: false, error: `"${prod.titulo}" ingresa próximamente. Reducí la cantidad para continuar.` }
      }
    }
  }

  const tipoCambioUsd = parseFloat(tcRow?.valor ?? '1') || 1

  const lineas = items.flatMap(item => {
    const prod = productos.find(p => p.id === item.productoId)
    if (!prod || !prod.precio_lista5) return []
    const { precio: precioArs } = aplicarTipoCambio(prod.precio_lista5, prod.moneda ?? null, tipoCambioUsd)
    if (precioArs === null) return []
    return [{ productoId: item.productoId, titulo: prod.titulo, cantidad: item.cantidad, precioUnit: precioArs }]
  })

  if (lineas.length === 0) return { ok: false, error: 'Ningún producto tiene precio configurado.' }

  // Re-cotizar envío server-side — nunca confiar en el precio del cliente (fix #3)
  let envio: EnvioResuelto | undefined
  if (envioParams) {
    const { opciones, error: envioError } = await cotizarEnvio({
      items,
      codigo_postal: envioParams.codigo_postal,
      provincia: envioParams.provincia,
    })
    const opcion = opciones.find(o => o.id === envioParams.servicioId)
    if (envioError || !opcion) {
      return { ok: false, error: 'No se pudo verificar el costo de envío. Recalculá antes de continuar.' }
    }
    envio = { descripcion: opcion.descripcion, costo: opcion.costo }
  }

  const subtotal = lineas.reduce((acc, l) => acc + l.precioUnit * l.cantidad, 0)
  const total = subtotal + (envio?.costo ?? 0)

  const expiraEn = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const pedidoInsert: Record<string, unknown> = {
    estado: 'pendiente_pago',
    total_usd: total,
    medio_pago: 'mercadopago',
    expira_en: expiraEn,
    costo_envio: envio?.costo ?? null,
    envio_descripcion: envio?.descripcion ?? null,
  }

  if (user) {
    pedidoInsert.cliente_id = user.id
  } else {
    pedidoInsert.guest_nombre   = guestData!.nombre.trim()
    pedidoInsert.guest_email    = guestData!.email.trim().toLowerCase()
    pedidoInsert.guest_telefono = guestData!.telefono?.trim() ?? null
  }

  const { data: pedido, error: pedidoError } = await service
    .from('pedidos')
    .insert(pedidoInsert)
    .select('id')
    .single()

  if (pedidoError || !pedido) return { ok: false, error: 'Error al crear el pedido.' }

  const { error: itemsError } = await service.from('pedido_items').insert(
    lineas.map(l => ({
      pedido_id: pedido.id,
      producto_id: l.productoId,
      cantidad: l.cantidad,
      precio_unit: l.precioUnit,
    }))
  )
  if (itemsError) {
    await service.from('pedidos').delete().eq('id', pedido.id)
    return { ok: false, error: 'Error al registrar los ítems del pedido.' }
  }

  const payerEmail = user?.email ?? guestData!.email.trim().toLowerCase()

  try {
    const preference = getMPPreference()
    const response = await preference.create({
      body: {
        items: [
          ...lineas.map(l => ({
            id: String(l.productoId),
            title: l.titulo,
            quantity: l.cantidad,
            unit_price: l.precioUnit,
            currency_id: 'ARS',
          })),
          ...(envio ? [{
            id: 'envio',
            title: envio.descripcion,
            quantity: 1,
            unit_price: envio.costo,
            currency_id: 'ARS',
          }] : []),
        ],
        payer: { email: payerEmail },
        back_urls: {
          success: `${APP_URL}/checkout/exito`,
          failure: `${APP_URL}/checkout/fallo`,
          pending: `${APP_URL}/checkout/pendiente`,
        },
        auto_return: 'approved',
        external_reference: pedido.id,
        notification_url: `${APP_URL}/api/mp/webhook`,
        statement_descriptor: 'REUNATA',
      },
    })

    await service
      .from('pedidos')
      .update({ mp_preference_id: response.id })
      .eq('id', pedido.id)

    revalidatePath('/pedidos')

    const url = isSandbox() ? response.sandbox_init_point : response.init_point
    if (!url) {
      await service.from('pedidos').delete().eq('id', pedido.id)
      return { ok: false, error: 'No se pudo obtener la URL de pago.' }
    }

    return { ok: true, init_point: url }
  } catch (err) {
    await service.from('pedidos').delete().eq('id', pedido.id)
    console.error('[checkout/mp]', err)
    return { ok: false, error: 'Error al conectar con Mercado Pago. Intentá de nuevo.' }
  }
}
