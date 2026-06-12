# Variantes de color por producto (StockVariante de Gesu)

Implementado: junio 2026  
Rama: `stock-variante` → mergeada a `main`

---

## Qué hace

Permite que un producto muestre un selector de colores en su ficha antes de agregar al carrito. Los datos vienen del campo `StockVariante` de la API de Gesu, que codifica variantes con su stock por color.

---

## Origen de los datos

La API `GET /api_items.php` de Gesu incluye el campo `StockVariante` (nota: capital S, inconsistente con el resto del camelCase):

```
"StockVariante": "NEGRO:409.00;VERDE:0.00;BLANCO:-10.00;ROSA:-7.00;LILA:1.00;AQUA:1.00;SURTIDO:-122.00"
```

El formato es `NOMBRE:stock;NOMBRE:stock;...` donde el stock puede ser negativo (oversold en Gesu). Algunos productos tienen variantes compuestas:

```
"NEGRO,LISA:0.00;NEGRO,GRIEGA:0.00;BORRAVINO,SURTIDO:11.00"
```

La función `parseStockVariante()` en `api/sync/productos/route.ts` usa `lastIndexOf(':')` para manejar correctamente los nombres con comas y otros caracteres especiales.

---

## Base de datos

| Tabla | Columna | Tipo | Descripción |
|---|---|---|---|
| `productos` | `variantes` | `jsonb` | Array `[{nombre, stock}]` o `null` si no tiene variantes |
| `pedido_items` | `variante` | `text` | Color elegido al momento de crear el pedido |

La columna `variantes` se puebla en cada sync con Gesu. Si `StockVariante` está vacío o es inválido, queda en `null` y el producto no muestra picker.

---

## Clave de carrito compuesta (`itemKey`)

El campo `itemKey` en `CartItem` permite que el mismo producto en distintos colores coexista como ítems separados en el carrito:

```
itemKey = `${productoId}:${variante ?? ''}`
```

Ejemplos:
- `"12:NEGRO"` — Mate Viajero Premium, color Negro
- `"12:VERDE"` — Mate Viajero Premium, color Verde  
- `"12:"` — cualquier producto sin variante seleccionada

**Retrocompatibilidad:** ítems guardados en `localStorage` antes de esta feature no tienen `itemKey`. El helper `ik(i)` en el store hace fallback a `${productoId}:` automáticamente, evitando que los carritos existentes se rompan.

---

## Componentes

### `ColorPicker` (`src/components/sections/ColorPicker.tsx`)

Muestra los swatches y maneja la selección. Recibe `variantes`, `selected` y `onSelect`.

- Swatch de 28×28px, borde outline cuando seleccionado
- Stock ≤ 0: opacidad 35% + símbolo `×`
- `SURTIDO`: gradiente arcoíris
- Colores desconocidos: gris neutro `#cbd5e1` como fallback

### `VarianteBadge` (`src/components/sections/ColorPicker.tsx`)

Chip pequeño con el círculo de color y el nombre. Se usa en `CartDrawer` y `CartClient`.

### `AddToCartButton` (`src/components/sections/AddToCartButton.tsx`)

- Si el producto tiene variantes: muestra `ColorPicker` antes del stepper
- Botón bloqueado ("Elegí un color") hasta que se seleccione una variante
- El estado "En tu carrito" es por `itemKey` específico (verde en carrito no muestra check al ver negro)

---

## Flujo de sync

1. Gesu devuelve `StockVariante` en cada ítem del endpoint `api_items.php`
2. `parseStockVariante()` lo convierte a `[{nombre, stock}]` o `null`
3. El upsert escribe la columna `variantes` en `productos`
4. El próximo render de `/tienda/p/[id]` ya incluye `variantes` en la query y lo pasa a `AddToCartButton`

---

## Mapa de colores

Definido en `ColorPicker.tsx` como `COLOR_MAP`. Cubre los colores que Gesu usa actualmente (NEGRO, BLANCO, VERDE, ROSA, AQUA, LILA, ROJO, AZUL, GRIS, CHAMPAGNE, ORO, VIOLETA, CELESTE, NARANJA, BORRAVINO, CHOCOLATE, MANTECA, ARENA, ROSÉ, PLATEADO, PLATA, NATURAL, CAMUFLADO, AZUL NOCHE, AZUL PERLADO, VERDE PINO, y variantes con sufijo "PP"). Para agregar colores nuevos, editar el objeto `COLOR_MAP`.

---

## Pedidos (mayoristas)

La variante se propaga en toda la cadena del pedido formal:

1. `CartDrawer` → `crearPedidoBorrador({ productoId, cantidad, variante })`
2. `pedidos.ts` → `lineasResueltas` incluye `variante` por línea
3. `pedido_items.insert()` → guarda `variante` en la columna correspondiente

El mensaje de WhatsApp también incluye el color: `• Mate Viajero Premium (NEGRO) x10`.

---

## Limitaciones conocidas

- **ProductGridPublic** (grilla de tienda): el botón "+ Agregar" rápido no muestra picker. Agrega sin variante (`itemKey = "${id}:"`). Para productos con variantes, lo correcto es ir a la ficha del producto. Se puede mejorar en el futuro redirigiendo a `/tienda/p/[id]` cuando el producto tiene variantes.
- **Checkout MP (minoristas)**: la variante no se pasa a la descripción del ítem en la preferencia de Mercado Pago. Pendiente para una iteración futura.
- **Variantes compuestas** (ej: `NEGRO,LISA`): se muestran con su nombre completo en el picker, sin mapeo de color específico (usan el color base `NEGRO`).
