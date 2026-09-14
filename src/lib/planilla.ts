/**
 * Parseo de pegado desde una planilla (Excel / Google Sheets).
 *
 * Vive separado de la action para poder razonarlo y probarlo sin base: las dos
 * cosas que rompen acá —el separador y el formato del número— son de texto puro,
 * y los dos bugs que tuvo este parser fueron silenciosos.
 */

/**
 * Con qué se separan las columnas de ESTE pegado.
 *
 * Se decide una vez para todo el texto, por precedencia, en vez de aceptar
 * cualquiera de los tres en el mismo split. La versión anterior partía con
 * `/\t|;|,(?=\s*\S)/` y eso rompía en silencio: una cantidad real de proforma
 * escrita `1,200` matcheaba el separador, la fila pasaba a tener una columna de
 * más, y `parseInt` se quedaba con el `1`. El viaje quedaba cargado con 1 unidad
 * en vez de 1200 y nadie se enteraba hasta que el producto aparecía agotado.
 *
 * El tab gana siempre porque es lo que produce copiar celdas de Excel, que es el
 * camino real. La coma se acepta solo si no hay ni tab ni `;` en todo el texto
 * — ahí sí es un CSV de verdad.
 */
export function detectarSeparador(texto: string): RegExp {
  if (texto.includes('\t')) return /\t/
  if (texto.includes(';')) return /;/
  return /,/
}

/**
 * Cantidad de unidades, tolerando cómo la escribe una planilla real.
 *
 * Acepta `1200`, `1.200` y `1,200` (separador de miles en grupos de tres, en
 * cualquiera de las dos convenciones) y también `1 200`, que es lo que sale de
 * algunas exportaciones.
 *
 * Devuelve null —y NO 0— para cualquier otra cosa. Eso es deliberado: un `0.042`
 * es el CBM de la fila, no una cantidad, y la versión anterior lo dejaba pasar
 * como 0 porque el único guard era `cantidad < 0`. Un ítem con cantidad 0 no da
 * error en ningún lado: simplemente aparece agotado para siempre.
 */
export function parseCantidad(crudo: string): number | null {
  const limpio = crudo.replace(/[\s ]/g, '')
  if (!limpio) return null

  // Miles en grupos de tres, con punto o con coma: 1.200 / 1,200 / 12.345.678
  //
  // El primer grupo NO puede empezar en cero, y eso no es cosmético: sin esa
  // restricción `0.042` (el CBM de la fila) matchea como "miles", se le sacan los
  // separadores y queda 42. O sea, el mismo bug de antes con otra cara — una
  // columna que no es cantidad entrando como cantidad, en silencio.
  if (/^[1-9]\d{0,2}([.,]\d{3})+$/.test(limpio)) {
    const n = parseInt(limpio.replace(/[.,]/g, ''), 10)
    return Number.isSafeInteger(n) ? n : null
  }

  if (/^\d+$/.test(limpio)) {
    const n = parseInt(limpio, 10)
    return Number.isSafeInteger(n) ? n : null
  }

  // Decimal, texto, celda vacía, "1.2", "12 u.", "-5": no es una cantidad.
  return null
}

/** Cabeceras típicas, para no reportar la primera fila como un error del usuario. */
const PALABRAS_CABECERA = [
  'codigo', 'código', 'cod', 'sku', 'articulo', 'artículo',
  'color', 'variante', 'cantidad', 'cant', 'unidades', 'qty', 'descripcion', 'descripción',
]

function pareceCabecera(cols: string[]): boolean {
  const texto = cols.join(' ').toLowerCase()
  return PALABRAS_CABECERA.some(p => texto.includes(p))
}

export interface FilaPlanilla {
  codigo: string
  variante: string | null
  cantidad: number
}

export interface ParseoPlanilla {
  filas: FilaPlanilla[]
  /** Filas que no se pudieron leer, con el texto original para mostrárselo al usuario. */
  invalidas: string[]
  /** Fila de encabezado detectada y salteada, si hubo. */
  cabeceraIgnorada: string | null
}

/**
 * Texto pegado → filas listas para insertar.
 *
 * Formato por línea: `codigo · cantidad` o `codigo · color · cantidad`. La
 * cantidad se toma SIEMPRE de la última columna y el color de la segunda, no de
 * una posición fija contada desde el principio: una proforma trae columnas de
 * más (descripción, CBM, FOB) y contar desde la izquierda tomaba el CBM como
 * cantidad.
 *
 * Nada se descarta en silencio: lo que no se pudo leer vuelve en `invalidas`
 * para que el panel lo muestre. Que el usuario vea qué se ignoró es la mitad del
 * valor de un importador — sin eso, "pegué y no sé qué pasó".
 */
export function parsearPlanilla(texto: string): ParseoPlanilla {
  const separador = detectarSeparador(texto)
  const invalidas: string[] = []
  const filas: FilaPlanilla[] = []
  let cabeceraIgnorada: string | null = null

  const lineas = texto.split('\n').map(l => l.trim()).filter(Boolean)

  for (const [i, linea] of lineas.entries()) {
    const cols = linea.split(separador).map(c => c.trim()).filter((c, idx, arr) => {
      // Una celda vacía al final (fila terminada en separador) no es una columna.
      return !(c === '' && idx === arr.length - 1)
    })

    if (cols.length < 2) {
      invalidas.push(linea)
      continue
    }

    const codigo = cols[0]
    // La cantidad es la ÚLTIMA columna con contenido, no la segunda ni la tercera.
    const cantidad = parseCantidad(cols[cols.length - 1])

    if (!codigo || cantidad === null) {
      // La primera fila con palabras de encabezado es la cabecera, no un error.
      if (i === 0 && pareceCabecera(cols)) {
        cabeceraIgnorada = linea
        continue
      }
      invalidas.push(linea)
      continue
    }

    // Dos columnas = código + cantidad. Tres o más = el color es la segunda;
    // lo que haya en el medio (descripción, CBM, FOB) se ignora.
    const variante = cols.length >= 3 ? (cols[1] || null) : null

    filas.push({
      codigo,
      variante: variante ? variante.toUpperCase() : null,
      cantidad,
    })
  }

  return { filas, invalidas, cabeceraIgnorada }
}
