# Auditoría de Bugs — Carrito, Canalización y Multimedia

**Proyecto:** Reunata Marketplace
**Fecha:** 2026-06-06
**Alcance:** Carrito de compras, pipeline multimedia, gating por tipo de usuario, checkout Mercado Pago

---

## Resumen

| Severidad | Cantidad | Impacto |
|-----------|----------|---------|
| 🔴 Crítico | 3 | Seguridad, bypass de reglas de negocio |
| 🟠 Alto | 6 | Bugs funcionales, pérdida de integridad, UX rota |
| 🟡 Medio | 7 | Edge cases, race conditions, consistencia |
| 🟢 Bajo | 5 | UX menor, optimización, hardening |

---

## 🔴 Críticos

### 1. MP Webhook sin verificación de firma

**Archivo:** `src/app/api/mp/webhook/route.ts:11-14`

El webhook no verifica la cabecera `x-signature` ni procesa el body POST. Cualquier actor puede hacer `POST /api/mp/webhook?topic=payment&id=<pedido_id>` y marcar un pedido como `pago_confirmado`. Esto permite aprobar pagos falsos sin restricción.

Además, MercadoPago v2/IPN envía los datos en el **body JSON** (`{ action, data: { id } }`), no en query params. La línea `params.get('data.id')` es dead code — nunca matchea contra un query param real. Si la configuración de notificaciones de MP está en modo v2, el webhook no procesa **ningún** pago legítimo tampoco.

**Fix:**
- Leer `await req.json()` para extraer `{ type, data: { id } }`
- Verificar `x-signature` contra el webhook secret de MP usando HMAC-SHA256
- Extraer `data.id` del JSON, no de query params

---

### 2. Guest checkout ignora restricciones de múltiplo

**Archivo:** `src/app/actions/checkout.ts:49-72`

La validación de múltiplos de cantidad está dentro de `if (user)`. Los usuarios invitados (sin sesión) pueden comprar cualquier cantidad sin respetar los múltiplos configurados por canal. Si un producto del canal `distribuidor` tiene `multiplo=6`, un guest puede comprar 1 unidad.

**Fix:** Extraer la validación de múltiplos del guard `if (user)`. Para guests, usar el `canal_id` de `consumidor_final` (o validar contra `multiplo` del canal público por defecto).

---

### 3. Mayoristas no aprobados pueden crear pedidos borrador con precios

**Archivos involucrados:**
- `src/components/cliente/CartDrawer.tsx:29-35`
- `src/app/actions/pedidos.ts:12-38`
- `src/app/(public)/layout.tsx:30`

`PublicLayout` clasifica a un mayorista **no aprobado** como `tipoCliente='mayorista'`. El drawer muestra el botón "Enviar pedido" que ejecuta `crearPedidoBorrador()`. Esta server action no verifica `profiles.aprobado`. El precio del producto ya está en el `CartItem` del store (guardado al momento de agregar) sin validar permisos de visualización.

**Resultado:** Un mayorista no aprobado puede:
1. Ver productos en la tienda (las páginas los bloquean con `PendingApproval`)
2. Pero desde el drawer lateral, saltarse el bloqueo y crear pedidos con precios

**Fix:**
- En `crearPedidoBorrador`, verificar `profiles.aprobado === true`
- En `CartDrawer`, no renderizar el botón "Enviar pedido" si el usuario no está aprobado
- En `PublicLayout`, distinguir `tipoCliente` teniendo en cuenta `aprobado`

---

## 🟠 Altos

### 4. Checkout permite comprar productos sin stock cuando `stock_visible` es null

**Archivo:** `src/app/actions/checkout.ts:89-94`

```ts
if (prod && prod.stock_visible !== null && prod.stock_visible < item.cantidad)
```

Si `stock_visible = null`, la verificación se omite (null = stock ilimitado). Pero el producto puede tener `stock = 0` con `stock_visible = null`. En ese caso, la UI muestra "Sin stock" (`p/[id]/page.tsx:154` usa `stock_visible ?? stock`), pero el checkout permite la compra igual.

**Fix:** Verificar `stock_visible ?? stock` en el checkout, o forzar que `stock_visible` se sincronice siempre con `stock`.

---

### 5. Webhook no procesa el body POST de MercadoPago

**Archivo:** `src/app/api/mp/webhook/route.ts:12-14`

El webhook solo lee `searchParams` (query string). MP v2 envía los datos en el body como:
```json
{ "action": "payment.updated", "data": { "id": "123456" } }
```

`params.get('id')` y `params.get('data.id')` no extraen nada del body. Como resultado:
- Si MP está configurado en IPN v2: **ningún pago se procesa**
- El webhook responde `{ ok: true }` para todo sin hacer nada
- Mismo bug que #1, causa distinta

**Fix:** Leer `await req.json()` al inicio del handler.

---

### 6. `handleInput` / `handleMenos` pueden dejar cantidades no múltiplo en el carrito

**Archivo:** `src/app/(public)/carrito/CartClient.tsx:52-63`

`handleInput` redondea hacia arriba con `Math.ceil(n / multiplo) * multiplo`, pero `handleMenos` simplemente resta el múltiplo sin redondear:

```ts
// handleMenos
const nueva = cantidad - multiplo
if (nueva <= 0) remove(productoId)
else updateCantidad(productoId, nueva)  // ← puede ser no múltiplo
```

Si un usuario escribe "5" con multiplo=3 → redondea a 6. Luego clickea "menos" → 6-3=3 ✓. Pero si por cualquier razón la cantidad queda en un valor no múltiplo (ej: 4), clickear "menos" da 4-3=1, que no es múltiplo de 3.

El checkout lo rechazaría, pero el carrito quedaría en estado inválido y confuso.

**Fix:** `handleMenos` debería redondear al múltiplo más cercano hacia abajo:
```ts
const step = multiplo
const nueva = Math.max(step, cantidad - step)
updateCantidad(productoId, Math.floor(nueva / step) * step)
```

---

### 7. Pedidos huérfanos sin mecanismo de limpieza

**Archivo:** `src/app/actions/checkout.ts:110-143`

Si el usuario cierra el navegador después de crear el pedido pero antes de completar el pago en MercadoPago, el pedido queda en `pendiente_pago` eternamente. Si vuelve a intentarlo, se crea **otro** pedido distinto. No hay cron job, edge function ni TTL que limpie pedidos abandonados.

**Fix:**
- Agregar columna `expira_en` a la tabla `pedidos`
- Crear un cron job o edge function que cancele pedidos con `estado='pendiente_pago'` y `created_at > 24h`
- Alternativa: al iniciar un nuevo checkout, cancelar pedidos `pendiente_pago` previos del mismo usuario

---

### 8. Precios en OfferDrawer sin formatear

**Archivo:** `src/components/sections/FloatingActions.tsx:83-84`

```tsx
<span className="text-base font-bold">${item.precio}</span>
```

Muestra números crudos (ej: `$12500`) en vez de usar `formatPrecio()` que produce `$ 12.500`. Inconsistente con el resto de la app.

**Fix:** Usar `formatPrecio(item.precio)`.

---

### 9. `crearPedidoBorrador` no valida stock ni múltiplos

**Archivo:** `src/app/actions/pedidos.ts:12-38`

A diferencia de `iniciarCheckoutMP` (que valida stock y múltiplos), `crearPedidoBorrador` —usado por mayoristas desde el drawer— no hace **ninguna** validación de negocio. Un mayorista puede pedir 1000 unidades de un producto con stock 5.

**Fix:** Replicar la validación de stock y múltiplos que ya existe en `iniciarCheckoutMP`.

---

## 🟡 Medios

### 10. CartStore `clearIfOwnerChanged` — el carrito sobrevive al login

**Archivo:** `src/stores/cartStore.ts:65-72`

```ts
if (current !== null && current !== userId) {
  set({ items: [], ownerId: userId })
} else {
  set({ ownerId: userId })
}
```

Si `current === null` (sesión anónima), los items del carrito **no se limpian** al iniciar sesión. Los productos que agregó un usuario anónimo se transfieren al usuario autenticado. Si el usuario cierra sesión y otra persona usa el mismo navegador, los items del anterior persisten.

**Fix:** Evaluar si este comportamiento es deseado. Si no, limpiar siempre en `SIGNED_IN`. Si sí, al menos mostrar un toast "¿Querés conservar los items de tu visita anterior?".

---

### 11. `resolverCanalTienda` escribe a DB en cada page load

**Archivo:** `src/lib/tienda.ts:75-96`

Para `consumidor_final` sin `canal_id`, **cada request** ejecuta un `UPDATE profiles SET canal_id, aprobado=true`. Si el usuario navega 10 páginas, son 10 writes innecesarios. En producción con tráfico esto escala mal.

**Fix:** Hacer el write de auto-reparación una sola vez — en el middleware o en el callback de auth. Cachear el resultado en la sesión/cookie para no consultar DB en cada page load.

---

### 12. RLS `producto_fotos` — lectura anónima sin filtro

**Archivo:** `supabase/migrations/20260427000000_public_read_policies.sql:14-16`

```sql
create policy "public_read_fotos" on public.producto_fotos
  for select to anon using (true);
```

Permite a cualquiera leer **todas** las filas de `producto_fotos`, incluyendo fotos de productos inactivos. Un scraper podría enumerar todos los IDs de producto.

**Fix:** Agregar join a `productos` con `activo = true`, o usar la misma lógica de filtrado que productos.

---

### 13. Auth callback — `UPDATE` sin verificar que la fila existe

**Archivo:** `src/app/auth/callback/route.ts:66-74`

Usa `UPDATE profiles SET ... WHERE id = userId`. Si el trigger `handle_new_user()` aún no creó la fila (race condition en el callback de OAuth), el UPDATE afecta 0 filas **silenciosamente**. El usuario de Google queda sin `canal_id` ni `aprobado=true`, y RLS le niega el acceso a productos.

**Fix:** Usar `UPSERT` (`.upsert()`) en vez de `UPDATE`, o verificar `rowCount` y reintentar.

---

### 14. `handleMenos` en `AddToCartButton` elimina items prematuramente

**Archivo:** `src/components/sections/AddToCartButton.tsx:29-35`

```ts
const nueva = itemEnCarrito.cantidad - multiplo
if (nueva < multiplo) remove(producto.id)
```

Si `cantidad = 5, multiplo = 3`: `5 - 3 = 2 < 3` → **elimina** el producto del carrito. El usuario esperaba reducirlo de 5 a 2 o de 5 a 3 (mínimo), pero el producto desaparece.

**Fix:**
```ts
if (nueva < multiplo) updateCantidad(producto.id, multiplo)  // mantener mínimo
else updateCantidad(producto.id, nueva)
```

---

### 15. Webhook no es idempotente — `fecha_pago` cambia en reintentos

**Archivo:** `src/app/api/mp/webhook/route.ts:30-37`

Si MP retransmite una notificación `approved`, el webhook vuelve a ejecutar:
```ts
fecha_pago: new Date().toISOString()
```

La `fecha_pago` se sobrescribe con la fecha actual, perdiendo la fecha real del pago original. Esto corrompe datos de auditoría y reporting.

**Fix:** Solo setear `fecha_pago` si es la primera vez que pasa a `approved` (cuando `estado != 'pago_confirmado'`).

---

### 16. Checkout ignora `stock` cuando `stock_visible` es null — inconsistencia con UI

**Archivos:**
- `src/app/actions/checkout.ts:89-94` (checkout: solo `stock_visible`)
- `src/app/(public)/tienda/p/[id]/page.tsx:154` (UI: `stock_visible ?? stock`)

La UI y el checkout usan fuentes distintas para el control de stock. Si `stock_visible = null, stock = 0`:
- UI muestra "Sin stock"
- Checkout permite la compra

**Fix:** Unificar: checkout debe usar `stock_visible ?? stock`.

---

## 🟢 Bajos

### 17. HeroCarousel — iframes sin atributo `sandbox`

**Archivo:** `src/components/sections/HeroCarousel.tsx:98-111`

Los iframes de YouTube/Vimeo no tienen `sandbox`. Si un admin configura una URL maliciosa, el iframe tendría acceso sin restricciones. Bajo riesgo (solo admins pueden configurar URLs), pero es hardening recomendable.

**Fix:** Agregar `sandbox="allow-scripts allow-same-origin"` a los iframes.

---

### 18. PromoTicker — sin límite práctico de velocidad mínima

**Archivo:** Panel admin en `PromoClient.tsx`

El slider de velocidad permite 10-60s. Con 5+ frases a 10s, el texto se mueve demasiado rápido para ser legible. El valor por defecto (30s) es razonable, pero un admin podría configurarlo mal sin darse cuenta.

**Fix:** Validar mínimo de 20s en el slider o calcular velocidad en base a cantidad de frases.

---

### 19. CategoryGallery — sin paginación

**Archivo:** `src/components/sections/CategoryGallery.tsx`

Si hay 50+ categorías activas, la grilla se vuelve interminable en mobile (scroll infinito sin lazy load). Podría beneficiarse de paginación o virtual scrolling.

---

### 20. FloatingActions carga ofertas sin filtrar por canal

**Archivo:** `src/components/sections/FloatingActions.tsx:102-104`

`getOfertasPublic()` carga **todas** las ofertas (ambos canales: `ofertas` y `hotsale`). Se filtran en el cliente con `items.filter(i => i.canal === type)`. Si hay 1000+ ofertas, se transfieren al cliente innecesariamente.

**Fix:** Pasar el canal como parámetro a la server action y filtrar en la query.

---

### 21. `cartStore.clear()` no resetea `ownerId`

**Archivo:** `src/stores/cartStore.ts:61`

```ts
clear: () => set({ items: [] }),
```

`clear()` solo limpia `items`, dejando `ownerId` con el valor anterior. El próximo `clearIfOwnerChanged` compara contra este valor stale. Si un usuario A vacía el carrito manualmente, cierra sesión, y el usuario B inicia sesión, `clearIfOwnerChanged` compara `ownerId (A) !== userId (B)` → limpia el carrito (que ya está vacío). Comportamiento correcto, pero frágil.

**Fix:** `clear: () => set({ items: [], ownerId: null })`.

---

## Prioridad para producción

### Bloqueantes pre-lanzamiento (semana 0)
| # | Bug | Severidad |
|---|-----|-----------|
| 1 | MP Webhook sin verificación de firma | 🔴 Crítico |
| 3 | Mayoristas no aprobados crean pedidos | 🔴 Crítico |
| 2 | Guest ignora múltiplos | 🔴 Crítico |

### Primera semana post-lanzamiento
| # | Bug | Severidad |
|---|-----|-----------|
| 4 | Stock_visible null permite comprar sin stock | 🟠 Alto |
| 5 | Webhook no procesa body POST | 🟠 Alto |
| 9 | crearPedidoBorrador sin validación | 🟠 Alto |
| 8 | Precios sin formatear en OfferDrawer | 🟠 Alto |

### Backlog (semanas 2-3)
| # | Bug | Severidad |
|---|-----|-----------|
| 6 | handleMenos no redondea múltiplos | 🟠 Alto |
| 7 | Pedidos huérfanos sin limpieza | 🟠 Alto |
| 10 | CartStore sobrevive al login | 🟡 Medio |
| 11 | resolverCanalTienda escribe en cada request | 🟡 Medio |
| 13 | Auth callback UPDATE sin UPSERT | 🟡 Medio |
| 14 | AddToCartButton elimina prematuramente | 🟡 Medio |
| 15 | Webhook no es idempotente (fecha_pago) | 🟡 Medio |
| 16 | Checkout ignora stock (inconsistencia UI) | 🟡 Medio |

### Mejoras (cuando haya bandwidth)
| # | Bug | Severidad |
|---|-----|-----------|
| 12 | RLS producto_fotos sin filtro de activos | 🟡 Medio |
| 17 | HeroCarousel iframes sin sandbox | 🟢 Bajo |
| 18 | PromoTicker velocidad mínima | 🟢 Bajo |
| 19 | CategoryGallery sin paginación | 🟢 Bajo |
| 20 | FloatingActions carga todas las ofertas | 🟢 Bajo |
| 21 | cartStore.clear no resetea ownerId | 🟢 Bajo |

---

## Archivos auditados

```
src/stores/cartStore.ts
src/app/actions/checkout.ts
src/app/actions/pedidos.ts
src/app/actions/registro.ts
src/app/actions/clientes.ts
src/app/actions/canales.ts
src/lib/tienda.ts
src/lib/mercadopago.ts
src/lib/utils.ts
src/lib/supabase/server.ts
src/lib/supabase/middleware.ts
src/proxy.ts
src/app/api/mp/webhook/route.ts
src/app/auth/callback/route.ts
src/app/(public)/layout.tsx
src/app/(public)/carrito/CartClient.tsx
src/app/(public)/carrito/page.tsx
src/app/(public)/tienda/p/[id]/page.tsx
src/app/(public)/tienda/page.tsx
src/app/(public)/banco-imagenes/page.tsx
src/app/dashboard/layout.tsx
src/components/layout/Header.tsx
src/components/cliente/CartDrawer.tsx
src/components/sections/AddToCartButton.tsx
src/components/sections/ProductGridPublic.tsx
src/components/sections/FloatingActions.tsx
src/components/sections/HeroCarousel.tsx
src/components/sections/PendingApproval.tsx
src/components/SupabaseAuthListener.tsx
supabase/migrations/20260418000002_rls.sql
supabase/migrations/20260427000000_public_read_policies.sql
supabase/migrations/20260509181157_fix_fk_indexes_and_rls_initplan.sql
```
