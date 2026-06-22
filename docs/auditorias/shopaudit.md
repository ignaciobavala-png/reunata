# Auditoría: Carrito de compras — sesión 2026-06-22

> Modo: solo lectura (plan). Análisis profundo del flujo completo de precios, checkout, server components y logs.

---

## 1. Arquitectura del carrito (recordatorio)

```
Agregar producto
  ├─ AddToCartButton.tsx         — Stepper en ficha de producto, decide IVA según rol
  └─ ProductGridPublic.tsx       — Botón rápido en grilla, misma lógica

Store (Zustand + localStorage → 'reunata-cart')
  └─ cartStore.ts                — items[], ownerId, cartOpen, guestItemsMerged
       add()    → guarda precio (con o sin IVA según rol)
       updatePrecios() → pisa precios con record { productId: number }
       clearIfOwnerChanged() → merge guest o vacía carrito al cambiar de usuario

Visualización
  ├─ CartDrawer.tsx              — Lateral flotante, montado en layouts públicos
  └─ CartClient.tsx              — Página /carrito completa (767 líneas)

Checkout
  ├─ actions/checkout.ts         — iniciarCheckoutMP(): crea pedido + preferencia MP
  └─ actions/pedidos.ts          — crearPedidoBorrador(): pedido borrador para mayoristas

APIs internas
  ├─ /api/carrito/precios        — Refresca precios desde DB al montar /carrito
  └─ /api/carrito/reglas         — Reglas de canal (pago, descuentos, mínimo)

Infra
  ├─ lib/tienda.ts               — resolverCanalTienda(): sesión → canal → listaPrecio
  ├─ lib/utils.ts                — aplicarTipoCambio(), formatPrecio()
  ├─ lib/mercadopago.ts          — Wrapper de MP SDK
  ├─ lib/enviopack.ts            — Cotización de envío + auth JWT
  └─ SupabaseAuthListener.tsx    — onAuthStateChange → router.refresh() + cartStore sync
```

---

## 2. BUG CRÍTICO: Aumento sorpresivo de precios

### Raíz del problema

**Archivo**: `src/app/(public)/carrito/CartClient.tsx:119`

```ts
.catch(() => {})
```

La API `/api/carrito/precios` refresca los precios desde DB al cargar `/carrito`. Si falla (timeout, 500, network), **el store conserva precios viejos pero el checkout recalcula desde DB con precios actuales**. El usuario ve `$X` en pantalla y termina pagando `$Y` en Mercado Pago.

### Cadena de fallo completa

```
1. Admin hace sync de Gesu → precios en DB se actualizan
2. Usuario abre /carrito → se llama /api/carrito/precios
3. La API falla (500, timeout, o red) → .catch(() => {}) traga el error
4. updatePrecios() NUNCA se ejecuta → store queda con precios de cuando agregó
5. Usuario ve total = storePrecios, hace click en "Pagar con Mercado Pago"
6. iniciarCheckoutMP() IGNORA el store y lee precios frescos de DB (línea 104-115 checkout.ts)
7. MP cobra el precio nuevo → usuario ve un monto distinto al del carrito
```

### Factor agravante: tipo de cambio USD

```ts
// checkout.ts:129-137
const tipoCambioUsd = parseFloat(tcRow?.valor ?? '1') || 1
const { precio: precioArs } = aplicarTipoCambio(prod.precio_lista5, prod.moneda ?? null, tipoCambioUsd)
```

Productos con `moneda = 'u$s'` o `'USD'` pasan por `aplicarTipoCambio`. Si el TC cambió entre que el usuario agregó el producto y hace checkout:
- **Store**: precio calculado con TC viejo (o TC del momento de adición)
- **Checkout**: precio calculado con TC actual de DB
- La API `/api/carrito/precios` debería corregir esto, pero si falla → delta invisible

### Doble query de tipo_cambio_usd (condición de carrera)

Tanto `resolverCanalTienda()` (`tienda.ts:121-126`) como `/api/carrito/precios` (líneas 27-32) queryean `configuracion.tipo_cambio_usd`. Son dos requests independientes:

```
Request A (resolverCanalTienda)  → lee TC = 1200 (para mostrar en ficha)
Request B (/api/carrito/precios)  → lee TC = 1220 (admin lo acaba de cambiar)
```

Si `Request B` devuelve precios con TC=1220 y `Request A` mostró la ficha con TC=1200, hay un delta de ~1.6% que el usuario no puede anticipar.

### Fix propuesto

1. **Eliminar `.catch(() => {})`** y mostrar estado de carga/error al usuario
2. **Resolver precios server-side en `carrito/page.tsx`** y pasarlos como prop a `CartClient`, en lugar de depender de una API call asíncrona post-mount
3. **Re-consultar precios justo antes de checkout** y mostrar confirmación si cambiaron:

```ts
// Pseudocódigo del fix
async function handlePagarMP() {
  // 1. Re-fetch precios justo antes de pagar
  const fresh = await fetch('/api/carrito/precios', { body: { ids } })
  const { precios } = await fresh.json()
  
  // 2. Si cambiaron, avisar
  const cambios = items.filter(i => precios[i.productoId] !== i.precio)
  if (cambios.length > 0) {
    setErrorPago('Los precios se actualizaron. Revisá el total antes de continuar.')
    updatePrecios(precios) // refrescar la UI
    setPagando(false)
    return
  }
  
  // 3. Proceder con checkout
  await iniciarCheckoutMP(...)
}
```

---

## 3. BUG ALTO: IVA aplicado con criterio inconsistente

### El problema

Hay dos criterios distintos para decidir si se aplica IVA al precio:

| Componente | Criterio | Condición |
|-----------|----------|-----------|
| `AddToCartButton` (línea 64-67) | Rol del usuario | `esMayorista ? sinIva : conIva` |
| `ProductGridPublic` (línea 97-100) | Rol del usuario | `esMayorista ? sinIva : conIva` |
| `/api/carrito/precios` (línea 36-45) | Nombre de lista | `listaPrecio === 'precio_lista5' ? conIva : sinIva` |

Si un admin asignara `precio_lista5` a un canal mayorista (ej. `distribuidor`), ocurriría:
- `AddToCartButton`: `esMayorista=true` → guarda precio **SIN IVA**
- `/api/carrito/precios`: `listaPrecio='precio_lista5'` → refresca **CON IVA**
- Resultado: el precio sube ~21% al cargar `/carrito`

### En la práctica

Hoy esto no ocurre porque los canales mayoristas usan `precio_lista2` o `precio_lista3`. Pero el código es frágil: la decisión de IVA debería estar en un solo lugar y ser coherente.

### Fix propuesto

Unificar el criterio. Lo más seguro: que el **server siempre entregue el precio final** (con o sin IVA según corresponda) y el cliente solo lo muestre/almacene, sin hacer aritmética de IVA.

---

## 4. BUG MEDIO: `clearIfOwnerChanged` hereda items entre usuarios

### Escenario

```
1. Usuario A tiene sesión activa → cartStore.ownerId = 'A'
2. Token de A expira → refresh falla (sin red) → SIGNED_OUT
3. SupabaseAuthListener.tsx:21 → setOwner(null)
   // ownerId = null, items = [productos de A]
4. Usuario B inicia sesión en el mismo navegador
5. SIGNED_IN → clearIfOwnerChanged('B')
6. cartStore.ts:83 → current = null (por step 3)
7. Entra por path guestItemsMerged: true
8. ¡B hereda los items de A!
```

### Archivos involucrados

- `src/stores/cartStore.ts:81-90` — condición `current === null` asume guest merge
- `src/components/SupabaseAuthListener.tsx:18-22` — `SIGNED_OUT` solo hace `setOwner(null)`
- `src/components/LogoutButton.tsx:16` — logout explícito sí llama `clear()`

### Fix propuesto

`SIGNED_OUT` debería llamar `clear()` en lugar de `setOwner(null)`. El comentario en el código dice que no se limpia porque `SIGNED_OUT` puede dispararse por expiración de token (y el usuario podría reautenticarse). Pero el path correcto es:

1. Si el usuario se reautentica (mismo user) → `clearIfOwnerChanged` detecta `current === null` + `items.length > 0` → mergea como guest (que es lo deseado)
2. Si otro usuario se autentica → mismo path → hereda items (bug)

Solución: guardar también el `previousOwnerId` antes de limpiar, o usar un flag de `explicitLogout`:

```ts
// cartStore.ts
logOut: () => set({ items: [], ownerId: null, explicitLogout: true }),

clearIfOwnerChanged: (userId) => {
  const { ownerId, explicitLogout, items } = get()
  if (explicitLogout) {
    set({ ownerId: userId, explicitLogout: false, items: [] })
  } else if (ownerId !== null && ownerId !== userId) {
    set({ items: [], ownerId: userId })
  } else if (ownerId === null && items.length > 0) {
    set({ ownerId: userId, guestItemsMerged: true })
  } else {
    set({ ownerId: userId })
  }
}
```

---

## 5. BUG MEDIO: `precio_lista4` ausente en API de precios

**Archivo**: `src/app/api/carrito/precios/route.ts:24`

```ts
.select('id, precio_lista1, precio_lista2, precio_lista3, precio_lista5, moneda, stock, iva')
//                                    ↑ ↑ ↑                    ↑
//                                 precio_lista4 AUSENTE
```

Comparar con `acciones/pedidos.ts:40` que sí incluye las 5 listas:

```ts
.select('id, precio_lista1, precio_lista2, precio_lista3, precio_lista4, precio_lista5, moneda, stock_visible, stock')
```

Según `AGENTS.md`, `Lista4 → sin asignar`. Pero si en el futuro se asigna, los precios nunca se refrescarán para ese canal (el lookup `precioRaw = prod[listaPrecio]` devolvería `undefined` → `null`).

---

## 6. Server Components: escritura en DB durante render

**Archivo**: `src/lib/tienda.ts:82-86`

```ts
if (!canalId && profile.rol === 'consumidor_final') {
  await service
    .from('profiles')
    .update({ canal_id: canalCF.id, aprobado: true })
    .eq('id', user.id)
}
```

`resolverCanalTienda()` hace un UPDATE a `profiles` cuando un `consumidor_final` no tiene `canal_id`. Esta función se llama en **cada** page load de `/`, `/tienda`, `/carrito`, `/tienda/p/[id]`, etc.

### Consecuencias

- **Latencia**: +50ms por request (UPDATE innecesario después del primer acceso)
- **Supabase logs**: UPDATEs constantes en `profiles` que parecen actividad anómala
- **Concurrencia**: si dos tabs abren la página al mismo tiempo, hay dos UPDATEs simultáneos sobre la misma fila (inofensivo pero ruidoso)

### Fix propuesto (ya documentado como issue #11)

Mover la auto-reparación de `canal_id` a un middleware o caché. Alternativas:
1. Hacerlo una sola vez en `auth/callback/route.ts` (post-login)
2. Guardar un flag en cookie (`cf_repaired=1`)
3. Usar el trigger `handle_new_user()` de Supabase

---

## 7. Logs en producción con datos potencialmente sensibles

| Archivo | Línea | Qué loggea | Riesgo |
|---------|-------|-----------|--------|
| `actions/checkout.ts` | 256 | `console.error('[checkout/mp]', err)` | El error de MP puede incluir `access_token`, `preference_id`, datos de tarjeta enmascarados |
| `lib/enviopack.ts` | 28 | `console.error('[enviopack] vars no configuradas:', { apiKey: !!apiKey, secretKey: !!secretKey })` | Seguro (solo booleanos) |
| `lib/enviopack.ts` | 40 | `console.error('[enviopack] auth falló:', res.status, body)` | Loggea el **body crudo** del response de auth de EnvioPack. Podría incluir tokens o mensajes internos |
| `lib/enviopack.ts` | 46 | `console.error('[enviopack] respuesta sin token:', JSON.stringify(data))` | Loggea el **JSON completo** del endpoint de auth |
| `lib/tienda.ts:82-86` | — | UPDATE silencioso en DB | No es un `console.log`, pero genera eventos visibles en Supabase Logs |

### Fix propuesto

```ts
// checkout.ts:256
console.error('[checkout/mp]', err instanceof Error ? err.message : 'error desconocido')

// enviopack.ts:40
console.error('[enviopack] auth falló:', res.status, body?.substring?.(0, 100) ?? '(sin body)')

// enviopack.ts:46 — directamente remover o loggear solo status
```

---

## 8. `aplicarTipoCambio`: `!precio_lista5` trata `0` como inválido

**Archivo**: `src/app/actions/checkout.ts:133`

```ts
if (!prod || !prod.precio_lista5) return []
```

`!0 === true`, así que un producto con precio `0` (válido: producto de cortesía, muestra gratis) se saltea silenciosamente. El ítem desaparece del pedido sin warning.

### Fix

```ts
if (!prod || prod.precio_lista5 == null) return []
```

---

## 9. `con`/`sin` IVA: lo que el usuario ve vs. lo que paga

### Minorista (consumidor_final)

| Momento | ¿Incluye IVA? | Fuente |
|---------|:---:|--------|
| Ficha de producto | ✅ "IVA incluido" | `tienda/p/[id]/page.tsx:127` |
| Al agregar al carrito | ✅ `Math.round(precio * 1.21)` | `AddToCartButton.tsx:67` |
| En el carrito | ✅ (ya viene con IVA del store) | `CartClient.tsx:372` |
| En el drawer | ✅ (mismo store) | `CartDrawer.tsx:177` |
| Al hacer checkout | ✅ `precio_lista5 * TC * 1.21` | `checkout.ts:137-138` |
| En el resumen del carrito | ✅ "Total" (sin aclaración) | `CartClient.tsx:488-489` |

**Conclusión**: Minorista siempre ve y paga con IVA. No hay costo oculto, siempre que `/api/carrito/precios` funcione.

### Mayorista (distribuidor, local, mercha)

| Momento | ¿Incluye IVA? | Fuente |
|---------|:---:|--------|
| Ficha de producto | ❌ "Precio s/ IVA" | `tienda/p/[id]/page.tsx:134` |
| Al agregar al carrito | ❌ `precioBase` sin IVA | `AddToCartButton.tsx:66` |
| En el carrito | ❌ "Total s/ IVA" | `CartClient.tsx:488-489` |
| En el drawer | ❌ "Total" (sin aclaración) | `CartDrawer.tsx:192` |
| Pedido borrador | ❌ precio neto a DB | `pedidos.ts:87` |
| WhatsApp | ❌ "Total estimado" (sin aclarar IVA) | `CartClient.tsx:65` |

**Conclusión**: Mayorista NUNCA ve IVA. Es correcto — el IVA lo manejan en su propia factura. Pero el mensaje de WhatsApp dice "Total estimado" sin aclarar que es sin IVA. Si el mayorista asume que es el precio final, hay un malentendido.

### Guest (invitado)

| Momento | ¿Incluye IVA? | Fuente |
|---------|:---:|--------|
| Ficha de producto | ✅ "IVA incluido" | Igual que minorista |
| Al agregar al carrito | ✅ (sin sesión, asume minorista) | `ProductGridPublic.tsx:98-100` |
| En el carrito | ✅ | Store |
| Al hacer checkout | ✅ `precio_lista5 * TC * 1.21` | `checkout.ts:137-138` |

**Conclusión**: Guest se trata como minorista. Correcto.

---

## 10. ¿Hay "costos no dichos"?

### Costo de envío

El `EnvioCotizador` se muestra en el carrito solo para minoristas y guests (`CartClient.tsx:503-508`). Si el usuario no lo expande o no ingresa el CP, **no se suma al total**. El checkout fallará si `envioSeleccionado` no está definido (no se re-cotiza porque `iniciarCheckoutMP` recibe `envioParams` como opcional).

El envío **sí se muestra explícitamente** en el desglose cuando está seleccionado:

```tsx
// CartClient.tsx:474-477
{envioSeleccionado && (
  <div>
    <span>Envío</span>
    <span>{formatPrecio(envioSeleccionado.costo)}</span>
  </div>
)}
```

No es un costo oculto. Pero **el usuario debe manualmente calcular el envío** — no es automático.

### Comisiones de Mercado Pago

No se trasladan al comprador. Las absorbe el comercio. Correcto.

### Intereses de cuotas

El texto en el carrito lo aclara:

```tsx
// CartClient.tsx:492-494
<p>
  Precio de contado. Si pagás en cuotas con tarjeta, Mercado Pago aplica el interés de tu banco.
</p>
```

No es un costo oculto, pero el usuario no ve el monto de cada cuota hasta que está en el checkout de MP.

---

## 11. Resumen de bugs

| # | Severidad | Descripción | Archivo | Línea |
|---|:---:|---|---------|:---:|
| B1 | 🔴 Crítica | `.catch(() => {})` traga errores de refresh de precios → store desactualizado | `CartClient.tsx` | 119 |
| B2 | 🟡 Alta | IVA decidido por rol vs. listaPrecio — inconsistentes entre componentes | `AddToCartButton.tsx` vs `precios/route.ts` | 64 vs 36 |
| B3 | 🟡 Alta | `clearIfOwnerChanged` hereda items entre usuarios distintos post token expiry | `cartStore.ts` + `SupabaseAuthListener.tsx` | 81 vs 18 |
| B4 | 🟡 Alta | `console.error` loggea errores completos de MP y EnvioPack (datos sensibles) | `checkout.ts`, `enviopack.ts` | 256, 40, 46 |
| B5 | 🟡 Media | `precio_lista4` ausente en SELECT de `/api/carrito/precios` | `precios/route.ts` | 24 |
| B6 | 🟡 Media | `resolverCanalTienda()` escribe a DB en cada request (innecesario post 1er acceso) | `tienda.ts` | 82-86 |
| B7 | 🟢 Baja | `!precio_lista5` trata `0` como inválido (producto gratuito descartado) | `checkout.ts` | 133 |
| B8 | 🟢 Baja | Doble query de `tipo_cambio_usd` (race condition teórica entre resolver y API) | `tienda.ts` + `precios/route.ts` | 121 vs 27 |
| B9 | 🟢 Baja | Mensaje de WhatsApp no aclara "s/ IVA" para mayoristas | `CartClient.tsx` | 55-70 |

---

## 12. Verificaciones — lo que está bien

| Verificación | Archivo | OK? |
|---|---|---|
| Zustand persist con flag `mounted` | `CartClient.tsx:76`, `CartDrawer.tsx` | ✅ |
| `clearIfOwnerChanged` evita merge entre sesiones explícitas | `cartStore.ts:81-89` | ✅ |
| Stepper respeta múltiplos (`Math.ceil(n/multiplo)*multiplo`) | `CartClient.tsx:157-167` | ✅ |
| `handleMenos()` redondea a múltiplo antes de restar | `CartClient.tsx:150-155` | ✅ |
| Múltiplos validados server-side en checkout | `checkout.ts:92-98` | ✅ |
| Múltiplos validados en pedido borrador | `pedidos.ts:59-65` | ✅ |
| Stock validado server-side en checkout | `checkout.ts:119-127` | ✅ |
| Stock validado en pedido borrador | `pedidos.ts:68-76` | ✅ |
| Rollback de pedido si MP falla | `checkout.ts:247-249` | ✅ |
| Re-cotización de envío server-side (no confía en cliente) | `checkout.ts:146-157` | ✅ |
| CartDrawer suprimido en `/carrito` | `CartDrawer.tsx:30` | ✅ |
| Logout explícito limpia el carrito | `LogoutButton.tsx:16` | ✅ |
| Carrito vacío muestra mensaje + link a tienda | `CartClient.tsx:210-230` | ✅ |
| Banner "mediosdepago.png" oculto para mayoristas | `CartClient.tsx:754` | ✅ |
| `EnvioCotizador` oculto para mayoristas | `CartClient.tsx:503` | ✅ |
| `guest_itemsMerged` se limpia tras mostrarse una vez | `CartClient.tsx:124-127` | ✅ |
