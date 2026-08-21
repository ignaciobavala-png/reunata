export interface FotoOrdenable {
  orden: number | null
  destacada?: boolean | null
}

/**
 * Orden de las fotos de un producto, único para todo el sitio: primero la que
 * el admin marcó con la estrella ("Mostrar en home"), después el resto por el
 * `orden` que se fija con las flechas.
 *
 * La estrella es una sola por producto (índice único parcial en
 * producto_fotos), así que `ordenarFotos(...)[0]` es *la* foto de portada: la
 * miniatura de las grillas y de las tarjetas de categoría, y la que sale en el
 * slider "Más elegidos" de la home.
 *
 * Esta regla estaba copiada a mano en cada página y cada una desempataba
 * distinto: la home y el catálogo respetaban la estrella y las grillas de
 * /tienda no, así que un mismo producto se veía con dos fotos según dónde lo
 * miraras.
 */
export function ordenarFotos<T extends FotoOrdenable>(fotos: T[]): T[] {
  return [...fotos].sort((a, b) => {
    if (!!a.destacada !== !!b.destacada) return a.destacada ? -1 : 1
    return (a.orden ?? 0) - (b.orden ?? 0)
  })
}
