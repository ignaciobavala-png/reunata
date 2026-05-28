'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getMPPreference, isSandbox } from '@/lib/mercadopago'
import { revalidatePath } from 'next/cache'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

interface CheckoutItem {
  productoId: number
  cantidad: number
}

export async function iniciarCheckoutMP(
  items: CheckoutItem[]
): Promise<{ ok: boolean; init_point?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Necesitás iniciar sesión para continuar.' }

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'consumidor_final') {
    return { ok: false, error: 'Este método de pago es solo para minoristas.' }
  }

  const service = createServiceClient()

  // Validar múltiplos: leer canal del usuario y verificar cantidades
  const { data: profileCanal } = await supabase
    .from('profiles')
    .select('canal_id')
    .eq('id', user.id)
    .single()

  if (profileCanal?.canal_id) {
    const { data: multiplosDb } = await service
      .from('producto_canales')
      .select('producto_id, multiplo')
      .eq('canal_id', profileCanal.canal_id)
      .in('producto_id', items.map(i => i.productoId))

    for (const item of items) {
      const row = multiplosDb?.find(r => r.producto_id === item.productoId)
      const multiplo = row?.multiplo ?? 1
      if (multiplo > 1 && item.cantidad % multiplo !== 0) {
        return { ok: false, error: `La cantidad de un producto debe ser múltiplo de ${multiplo}.` }
      }
    }
  }

  const { data: productos } = await service
    .from('productos')
    .select('id, titulo, precio_lista5')
    .in('id', items.map(i => i.productoId))
    .eq('activo', true)

  if (!productos?.length) return { ok: false, error: 'Productos no disponibles.' }

  const lineas = items.flatMap(item => {
    const prod = productos.find(p => p.id === item.productoId)
    if (!prod || !prod.precio_lista5) return []
    return [{ productoId: item.productoId, titulo: prod.titulo, cantidad: item.cantidad, precioUnit: prod.precio_lista5 as number }]
  })

  if (lineas.length === 0) return { ok: false, error: 'Ningún producto tiene precio configurado.' }

  const total = lineas.reduce((acc, l) => acc + l.precioUnit * l.cantidad, 0)

  const { data: pedido, error: pedidoError } = await service
    .from('pedidos')
    .insert({ cliente_id: user.id, estado: 'pendiente_pago', total_usd: total, medio_pago: 'mercadopago' })
    .select('id')
    .single()

  if (pedidoError || !pedido) return { ok: false, error: 'Error al crear el pedido.' }

  await service.from('pedido_items').insert(
    lineas.map(l => ({
      pedido_id: pedido.id,
      producto_id: l.productoId,
      cantidad: l.cantidad,
      precio_unit: l.precioUnit,
    }))
  )

  try {
    const preference = getMPPreference()
    const response = await preference.create({
      body: {
        items: lineas.map(l => ({
          id: String(l.productoId),
          title: l.titulo,
          quantity: l.cantidad,
          unit_price: l.precioUnit,
          currency_id: 'ARS',
        })),
        payer: { email: user.email ?? undefined },
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
