// Orden de exhibición de canales en el admin, pedido por el tester (16/07):
// de menor a mayor descuento, con los especiales al final. Compartido entre
// Asignaciones (columnas) y la pestaña Canales (filas) para que no se
// desincronicen. Los slugs que no figuren van al final en su orden original.
export const ORDEN_CANALES = ['consumidor_final', 'emprendedores', 'local', 'pool_de_compras', 'distribuidor', 'mercha', 'fabricantes']

export function posCanal(slug: string) {
  const i = ORDEN_CANALES.indexOf(slug)
  return i === -1 ? ORDEN_CANALES.length : i
}

export function ordenarCanales<T extends { slug: string }>(canales: T[]): T[] {
  return [...canales].sort((a, b) => posCanal(a.slug) - posCanal(b.slug))
}
