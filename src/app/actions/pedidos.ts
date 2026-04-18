'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface LineaPedido {
  productoId: number
  cantidad: number
  precioUnit: number
}

export async function crearPedidoBorrador(lineas: LineaPedido[]): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const total = lineas.reduce((acc, l) => acc + l.precioUnit * l.cantidad, 0)

  const { data: pedido, error } = await supabase
    .from('pedidos')
    .insert({ cliente_id: user.id, estado: 'pendiente_pago', total_usd: total })
    .select('id')
    .single()

  if (error || !pedido) throw new Error(error?.message ?? 'Error creando pedido')

  await supabase.from('pedido_items').insert(
    lineas.map(l => ({
      pedido_id: pedido.id,
      producto_id: l.productoId,
      cantidad: l.cantidad,
      precio_unit: l.precioUnit,
    }))
  )

  revalidatePath('/dashboard/cliente/pedidos')
  return pedido.id
}

export async function subirComprobante(pedidoId: string, path: string) {
  const supabase = await createClient()
  await supabase.from('comprobantes').insert({ pedido_id: pedidoId, url: path })
  await supabase.from('pedidos').update({ estado: 'comprobante_subido' }).eq('id', pedidoId)
  revalidatePath(`/dashboard/cliente/pedidos/${pedidoId}`)
}

export async function confirmarPago(pedidoId: string, medioPago: string, referencia?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('pedidos').update({
    estado: 'pago_confirmado',
    medio_pago: medioPago,
    referencia_pago: referencia ?? null,
    pago_confirmado_por: user!.id,
    fecha_pago: new Date().toISOString(),
  }).eq('id', pedidoId)
  revalidatePath(`/dashboard/admin/pedidos`)
  revalidatePath(`/dashboard/cliente/pedidos/${pedidoId}`)
}

export async function actualizarEstadoPedido(pedidoId: string, estado: string) {
  const supabase = await createClient()
  await supabase.from('pedidos').update({ estado }).eq('id', pedidoId)
  revalidatePath('/dashboard/admin/pedidos')
  revalidatePath(`/dashboard/cliente/pedidos/${pedidoId}`)
}
