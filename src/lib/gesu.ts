// Categorías internas de gestión de Gesu que no son productos vendibles
// (costos, insumos, bienes de uso, preventa, desarrollo). El sync las excluye
// al importar, y el admin las oculta del listado: en la base quedaron filas
// viejas de antes de que existiera el filtro y NO se borran (decisión 16/07),
// solo se dejan de mostrar.
export const CATEGORIAS_INTERNAS = /^[MO]\)|preventa|productos en desarrollo|productos importados|bienes de uso/i

export function esCategoriaInterna(categoria: string | null | undefined): boolean {
  return !!categoria && CATEGORIAS_INTERNAS.test(categoria)
}
