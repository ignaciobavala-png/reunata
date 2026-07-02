interface ProductoStock {
  stock: number | null
  stock_visible?: number | null
  variantes?: { nombre: string; stock: number }[] | null
}

// Si el producto tiene variantes (colores) y se pide una en particular, su stock
// manda por sobre el stock agregado del producto — cada color se vende por separado.
export function stockDisponible(producto: ProductoStock, variante?: string | null): number | null {
  // La DB puede tener stock negativo (sobreventa/ajustes); hacia afuera significa 0 disponible.
  // Sin el piso, el clamp del carrito puede dejar cantidades negativas.
  if (variante && producto.variantes?.length) {
    const v = producto.variantes.find(v => v.nombre === variante)
    if (v) return Math.max(v.stock, 0)
  }
  const stock = producto.stock_visible ?? producto.stock
  return stock === null ? null : Math.max(stock, 0)
}
