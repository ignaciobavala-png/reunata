// Parseo de la "ficha técnica" de un producto. El admin la escribe como texto
// libre, una línea por dato con formato "Clave: Valor". Lo parseado alimenta
// los filtros clasificatorios de la tienda. Función pura — se usa igual en el
// server (al guardar) que en el cliente (preview del drawer, render).

export type Atributo = { clave: string; valor: string }

export function parseAtributos(texto: string | null | undefined): Atributo[] {
  if (!texto) return []
  const out: Atributo[] = []
  for (const linea of texto.split('\n')) {
    const idx = linea.indexOf(':')
    if (idx === -1) continue
    const clave = linea.slice(0, idx).trim()
    // Colapsa espacios internos para que "350  ml" y "350 ml" agrupen igual
    const valor = linea.slice(idx + 1).trim().replace(/\s+/g, ' ')
    if (clave && valor) out.push({ clave, valor })
  }
  return out
}
