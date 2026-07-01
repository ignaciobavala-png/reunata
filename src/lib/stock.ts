interface ProductoStock {
  stock: number | null
  stock_visible?: number | null
  variantes?: { nombre: string; stock: number }[] | null
}

// Si el producto tiene variantes (colores) y se pide una en particular, su stock
// manda por sobre el stock agregado del producto — cada color se vende por separado.
export function stockDisponible(producto: ProductoStock, variante?: string | null): number | null {
  if (variante && producto.variantes?.length) {
    const v = producto.variantes.find(v => v.nombre === variante)
    if (v) return v.stock
  }
  return producto.stock_visible ?? producto.stock
}
