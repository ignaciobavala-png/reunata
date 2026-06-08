# Auditoría: Carrito de Compras

> Fecha: 2026-06-07
> Objetivo: Auditar el carrito para cada tipo de usuario y relevar qué falta para tener un carrito comparable al de MercadoLibre.

---

## 1. Anatomía del carrito actual

### Componentes involucrados

| Componente | Archivo | Rol |
|-----------|---------|-----|
| CartStore (Zustand) | `src/stores/cartStore.ts` | Estado persistido en localStorage, items + cantidades |
| CartClient | `src/app/(public)/carrito/CartClient.tsx` | Página de carrito completo (451 líneas) |
| CartDrawer | `src/components/cliente/CartDrawer.tsx` | Drawer lateral flotante (mounted en layout público) |
| AddToCartButton | `src/components/sections/AddToCartButton.tsx` | Stepper + botón de agregar en ficha de producto |
| carrito/page.tsx | `src/app/(public)/carrito/page.tsx` | Server wrapper: lee sesión + `mostrarPrecios` |
| (public)/layout.tsx | `src/app/(public)/layout.tsx` | Monta CartDrawer, resuelve `tipoCliente` |
| checkout.ts | `src/app/actions/checkout.ts` | Inicia pago con MercadoPago |
| pedidos.ts | `src/app/actions/pedidos.ts` | Crea pedido borrador para mayoristas |

### Estructura de datos del carrito (CartStore)

```ts
// src/stores/cartStore.ts
interface CartItem {
  productoId: number
  codigo_interno: string
  titulo: string
  precio: number          // precio unitario guardado al agregar
  cantidad: number
  multiplo?: number
  foto_url?: string | null
}

interface CartStore {
  items: CartItem[]
  ownerId: string | null     // userId para detectar cambio de sesión
  cartOpen: boolean           // controla apertura del drawer
  add(item): void
  remove(productoId): void
  updateCantidad(productoId, cantidad): void
  clear(): void               // ⚠️ No resetea ownerId (bug #21)
  setOwner(userId): void
  clearIfOwnerChanged(userId): void  // Cambia de usuario → vacía carrito
  total(): number
  totalItems(): number
}
```

### Flujo de compra por tipo de usuario

```
Guest (sin sesión)
  Agregar → CartDrawer → /carrito → formulario (nombre/email/tel) → MP → /checkout/exito

Consumidor Final (logueado, aprobado)
  Agregar → CartDrawer → /carrito → botón MP → /checkout/exito

Mayorista (logueado, aprobado: distribuidor/local/mercha)
  Agregar → CartDrawer → /carrito → botón WhatsApp → chat con vendedor

Mayorista (logueado, pendiente: aprobado=false)
  Agregar → CartDrawer (mensaje "pendiente de aprobación") → /carrito (sin CTA)
```

---

## 2. Estado actual por tipo de usuario

| Feature | Guest | Consumidor | Mayorista (Aprobado) | Mayorista (Pendiente) |
|---------|-------|-----------|---------------------|---------------------|
| Agregar al carrito | ✅ | ✅ | ✅ | ✅ |
| Stepper con múltiplos | ✅ | ✅ | ✅ | ✅ |
| Drawer lateral | ✅ | ✅ | ✅ | ✅ |
| Página de carrito | ✅ | ✅ | ✅ | ✅ |
| Modificar cantidades | ✅ | ✅ | ✅ | ✅ |
| Eliminar ítems | ✅ | ✅ | ✅ | ✅ |
| Vaciar carrito | ✅ | ✅ | ✅ | ✅ |
| "Seguir comprando" | ✅ | ✅ | ✅ | ✅ |
| Ver precios | ✅ (Lista 5) | ✅ (Lista 5) | ✅ (lista de su canal) | ❌ |
| Foto del producto | ✅ | ✅ | ✅ | ✅ |
| Checkout con MP | ✅ (guest) | ✅ | ❌ (solo minorista) | ❌ |
| WhatsApp a vendedor | ❌ | ❌ | ✅ | ❌ |
| Banner medios de pago | ✅ | ✅ | ❌ | ❌ |
| Link login en carrito | ✅ (si no hay sesión) | N/A | N/A | N/A |

---

## 3. Gap analysis vs MercadoLibre

### 3.1 Features de MercadoLibre que faltan en Reunata

| # | Feature | ML | Reunata | Impacto | Afecta a |
|---|---------|:--:|:-------:|:-------:|----------|
| 1 | **Cálculo de envío** (CP → costo → fecha estimada) | ✅ | ❌ | 🔴 Alto | Todos |
| 2 | **Cupones / códigos de descuento** (a nivel carrito) | ✅ | ❌ | 🟡 Medio | Todos |
| 3 | **Warnings de stock bajo** ("Quedan X unidades") | ✅ | ❌ | 🟡 Medio | Todos |
| 4 | **Ítem no disponible** (producto pausado/eliminado desde que se agregó) | ✅ | ❌ | 🟡 Medio | Todos |
| 5 | **Precio cambió** ("Subió/Bajó desde que lo agregaste") | ✅ | ❌ | 🟡 Medio | Todos |
| 6 | **Calculadora de cuotas** (hasta X cuotas de $Y) | ✅ | ❌ | 🟡 Medio | Minorista |
| 7 | **Guardar para después / Mover a favoritos** | ✅ | ❌ | 🟢 Bajo | Todos |
| 8 | **Compra Protegida** (badge + info de garantía) | ✅ | ❌ | 🟢 Bajo | Minorista |
| 9 | **Cross-sell** ("Quienes compraron esto también…") | ✅ | ❌ | 🟢 Bajo | Todos |
| 10 | **Barra de envío gratis** ("Agregá $X más para envío gratis") | ✅ | ❌ | 🟢 Bajo | Todos |
| 11 | **Libro de direcciones** (múltiples guardadas) | ✅ | ❌ | 🟢 Bajo | Mayorista |
| 12 | **Selección de tipo de factura** (A/B/CF) | ✅ | ❌ | 🟢 Bajo | Mayorista |
| 13 | **Protección de compra** (seguro extra en el ítem) | ✅ | ❌ | 🟢 Bajo | Minorista |

### 3.2 Detalle de los gaps principales

---

#### Gap #1: Cálculo de envío 🔴

**MercadoLibre:** Input de código postal en el carrito. Muestra opciones de envío (domicilio/sucursal), costo, y fecha estimada de entrega. Si califica para envío gratis, muestra el badge.

**Reunata actual:** Cero lógica de envío. El PromoTicker dice "Envío gratis desde $100.000" pero es solo texto estático. No hay campo de CP, cálculo de costo, ni estimación de fecha.

**Qué hace falta:**
- Input de CP en el resumen del carrito (o en el formulario de guest)
- Lógica de cálculo de costo de envío (por CP, peso, o regla fija)
- Umbral de envío gratis configurable
- Fecha estimada de entrega

---

#### Gap #2: Cupones de descuento 🟡

**MercadoLibre:** Campo para ingresar código de cupón en el resumen de compra. Aplica descuento porcentual o fijo al total o a productos específicos.

**Reunata actual:** Las ofertas existen a nivel producto (`ofertas` table) pero no hay cupones a nivel carrito. El descuento se aplica en la ficha de producto, no en el checkout.

**Qué hace falta:**
- Tabla `cupones` (código, tipo: `porcentaje`/`fijo`, valor, `min_compra`, `usos_max`, `fecha_expiracion`)
- Campo de input en el resumen del carrito
- Validación server-side en checkout

---

#### Gap #3: Warnings de stock bajo 🟡

**MercadoLibre:** "Quedan X unidades" / "Últimos disponibles en este precio" en la línea de cada ítem.

**Reunata actual:** La columna `productos.stock_visible` existe y se usa en `checkout.ts` para validar stock suficiente. Pero **no se muestra** en el carrito ni en el drawer.

**Qué hace falta:**
- Query `stock_visible` al cargar el carrito
- Mostrar badge "Quedan X" cuando `stock_visible <= 10`

---

#### Gap #4: Ítem no disponible 🟡

**MercadoLibre:** Al cargar el carrito, si un producto fue pausado o eliminado, se muestra en gris con un mensaje: "Este producto ya no está disponible".

**Reunata actual:** El carrito se carga desde localStorage sin validar contra la DB. Si un producto se desactiva en Gesu, el ítem queda en el carrito con el precio viejo pero no se puede comprar (el checkout lo rechazará, pero el usuario no lo sabe hasta que intenta pagar).

**Qué hace falta:**
- Al cargar `/carrito`, validar cada `productoId` contra DB (`activo = true`)
- Mostrar ítems no disponibles en gris, con opción de eliminar
- Ídem en `CartDrawer`

---

#### Gap #5: Precio cambió 🟡

**MercadoLibre:** Si el precio de un producto bajó desde que lo agregaste, muestra "Bajó $X desde que lo agregaste". Si subió, muestra "Aumentó $X".

**Reunata actual:** El precio se guarda en el store al agregar y nunca se recalcula. Si el admin actualiza precios vía sync de Gesu, el carrito mantiene el precio viejo hasta que se re-agregue el producto.

**Qué hace falta:**
- Al cargar `/carrito`, comparar `item.precio` (store) con `precio` (DB actual)
- Mostrar delta positivo (subió) o negativo (bajó) en cada ítem

---

#### Gap #6: Calculadora de cuotas 🟡

**MercadoLibre:** Muestra "Hasta 12 cuotas sin interés de $X.XXX con Tarjeta Y" debajo del precio.

**Reunata actual:** Solo un banner estático `mediosdepago.png` al pie del carrito. El PromoTicker dice "6 cuotas sin interés" pero no hay cálculo real.

**Qué hace falta:**
- Configurar `installments` en la preferencia de MP (`payment_methods.installments`)
- Mostrar cuotas calculadas debajo del total: "3 cuotas de $X.XXX sin interés"

---

#### Gap #7: Guardar para después 🟢

**MercadoLibre:** Cada ítem tiene un botón "Guardar para después" que lo mueve a una sección separada dentro del carrito.

**Reunata actual:** Existe la página `/favoritos` como concepto separado, pero no hay botón "Mover a favoritos" desde el carrito ni sección de "guardados" en la página del carrito.

**Qué hace falta:**
- Botón "Mover a favoritos" en cada ítem del carrito
- O sección "Guardado para después" dentro del mismo carrito

---

#### Gap #8: Compra Protegida 🟢

**MercadoLibre:** Badge de "Compra Protegida" con tooltip explicando la garantía de devolución.

**Reunata actual:** No existe.

**Qué hace falta:**
- Badge visual en el resumen del carrito
- Página o modal con los términos de compra protegida

---

#### Gap #9: Cross-sell / Relacionados 🟢

**MercadoLibre:** Debajo del carrito: "Productos que podrían interesarte" basados en lo que hay en el carrito.

**Reunata actual:** No existe.

**Qué hace falta:**
- Query de productos de la misma categoría que los ítems del carrito
- Sección "También te puede interesar" al pie

---

## 4. Bugs específicos del carrito

Estos son bugs confirmados que ya están documentados en `AGENTS.md` o `category-auditory.md`:

| # | Bug | Archivo | Referencia | Severidad |
|---|-----|---------|-----------|-----------|
| B1 | `crearPedidoBorrador` no valida precios contra DB | `actions/pedidos.ts:45-62` | `category-auditory.md` #1 | 🔴 Crítico |
| B2 | `crearPedidoBorrador` no valida stock (`stock_visible`) | `actions/pedidos.ts:41-44` | `AGENTS.md` #4 | 🔴 Crítico |
| B3 | `stock_visible ?? stock` — se usa solo `stock_visible` | `checkout.ts:107` vs `pedidos.ts` | `AGENTS.md` #4 | 🟡 Medio |
| B4 | `clear()` no resetea `ownerId: null` | `cartStore.ts:61` | `AGENTS.md` #21 | 🟢 Bajo |
| B5 | `handleMenos` no redondea al múltiplo antes de restar | `CartClient.tsx:52-55` | `AGENTS.md` #6 | 🟡 Medio |
| B6 | Precios en carrito no se recalculan server-side | `carrito/page.tsx:22-24` | `category-auditory.md` #4 | 🟡 Medio |
| B7 | `handleMenos` en `AddToCartButton` quita el ítem si `nueva < multiplo` | `AddToCartButton.tsx:29` | `AGENTS.md` #14 | 🟡 Medio |
| B8 | Items de sesión anónima persisten al login sin confirmación | `cartStore.ts:65` | `AGENTS.md` #10 | 🟢 Bajo |

---

## 5. Tabla de cambios propuestos por bug

| Bug | Qué hay que cambiar | Dónde |
|-----|-------------------|-------|
| B1 | Queryear productos con la columna de precios del canal del usuario, usar precios de DB en vez de los del cliente | `actions/pedidos.ts` |
| B2 | Validar `stock_visible ?? stock` contra cantidad de cada ítem en el pedido | `actions/pedidos.ts` |
| B3 | Reemplazar `prod.stock_visible` por `prod.stock_visible ?? prod.stock` | `actions/checkout.ts:107` |
| B4 | `clear: () => set({ items: [], ownerId: null })` | `stores/cartStore.ts:61` |
| B5 | `const base = cantidad - (cantidad % multiplo); const nueva = base - multiplo` | `CartClient.tsx:52-55` |
| B6 | En `carrito/page.tsx`, re-leer precios desde DB con `servicio.listaPrecio` y pasarlos al cliente | `carrito/page.tsx` |
| B7 | Si `nueva < multiplo`, setear a `multiplo` en vez de remover | `AddToCartButton.tsx:29` |

---

## 6. Tabla de features propuestas (orden de prioridad)

| # | Feature | Prioridad | Esfuerzo est. | Archivos involucrados |
|---|---------|-----------|---------------|----------------------|
| F1 | Validación server-side de precios + stock en pedido mayorista | 🔴 Semana 1 | 2h | `actions/pedidos.ts` |
| F2 | Ítem no disponible al cargar carrito (validar activo=true) | 🔴 Semana 1 | 1h | `carrito/page.tsx`, `CartClient.tsx` |
| F3 | Warnings de stock bajo en carrito ("Quedan X unidades") | 🟡 Semana 2 | 1h | `CartClient.tsx`, `CartDrawer.tsx` |
| F4 | Barra de envío gratis ("Agregá $X más") | 🟡 Semana 2 | 2h | `CartClient.tsx` |
| F5 | Notificación de cambio de precio en carrito | 🟡 Semana 2 | 1.5h | `carrito/page.tsx`, `CartClient.tsx` |
| F6 | Cálculo de envío (CP → costo → fecha) | 🟡 Semana 3 | 6h | Nueva tabla `envios`, `CartClient.tsx`, `checkout.ts` |
| F7 | Cupones de descuento | 🟡 Semana 3 | 4h | Nueva tabla `cupones`, `actions/cupones.ts`, `CartClient.tsx` |
| F8 | Calculadora de cuotas con MP | 🟢 Semana 4 | 2h | `CartClient.tsx`, `checkout.ts` |
| F9 | Cross-sell / relacionados en carrito | 🟢 Semana 4 | 2h | `CartClient.tsx` |
| F10 | Guardar para después / Mover a favoritos | 🟢 Mes 2 | 2h | `CartClient.tsx`, `CartDrawer.tsx` |

---

## 7. Verificaciones — lo que SÍ está bien

| Verificación | Archivo | Estado |
|---|---|---|
| Zustand persist con rehidratación (mounted flag) | `CartClient.tsx:46` | ✅ |
| `clearIfOwnerChanged` evita que items de otro usuario se mezclen | `cartStore.ts:65-72` | ✅ |
| `CartClient` renderiza condicionalmente según `mounted` | `CartClient.tsx:98` | ✅ |
| Stepper respeta múltiplos en cantidades | `CartClient.tsx:234-258` | ✅ |
| Input number valida múltiplos (`Math.ceil(n / multiplo) * multiplo`) | `CartClient.tsx:59-62` | ✅ |
| Eliminar con confirmación de vaciado | `CartClient.tsx:140-165` | ✅ |
| CartDrawer suprimido en `/carrito` | `CartDrawer.tsx:43` | ✅ |
| `checkout.ts` valida múltiplos server-side | `checkout.ts:66-84` | ✅ |
| `checkout.ts` valida stock disponible server-side | `checkout.ts:104-109` | ✅ |
| `checkout.ts` usa `precio_lista5` (correcto para minorista) | `checkout.ts:91` | ✅ |
| Rollback del pedido si MP falla | `checkout.ts:175-180` | ✅ |
| Guest checkout con datos obligatorios validados | `CartClient.tsx:85-96` | ✅ |
| `AddToCartButton` recibe precio ya resuelto del server | `tienda/p/[id]/page.tsx:171-180` | ✅ |
| `AddToCartButton` abre el drawer al agregar | `AddToCartButton.tsx:56` | ✅ |
| Mayorista pendiente ve mensaje en vez de botón | `CartDrawer.tsx:172-188` | ✅ |
| WhatsApp build link con lista de ítems formateada | `CartClient.tsx:25-30` | ✅ |
| Login link en carrito guest (`/login?next=/carrito`) | `CartClient.tsx:422-423` | ✅ |
| Layout público monta CartDrawer con `tipoCliente` server-side | `(public)/layout.tsx:39-40` | ✅ |
| Página `/carrito` no indexada (robots noindex) | `carrito/page.tsx:6` | ✅ |
