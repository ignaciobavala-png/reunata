# Auditoría: Tipos de Usuario ↔ Canales ↔ Listas de Precios (Gesu)

> Fecha: 2026-06-07
> Objetivo: Verificar que cada tipo de cliente vea los precios correctos antes de lanzar a producción.

---

## 1. Arquitectura — el mapeo completo

```
Gesu API                          DB (productos)                   DB (canales)                    profiles.rol
─────────                         ──────────────                   ────────────                    ────────────
precioFinalLista1  ───────────►   precio_lista1   ◄──────  distribuidor    (slug=distribuidor)  ◄── distribuidor
precioFinalLista2  ───────────►   precio_lista2   ◄──────  local           (slug=local)         ◄── local
precioFinalLista3  ───────────►   precio_lista3   ◄──────  mercha          (slug=mercha)        ◄── mercha
precioFinalLista4  ───────────►   precio_lista4   ◄──────  (sin asignar)
precioFinalLista5  ───────────►   precio_lista5   ◄──────  consumidor_final (slug=consumidor_final) ◄── consumidor_final
                                                              fabricantes      (slug=fabricantes)    (manual)
```

### Tabla `canales` (seed data)

| slug | nombre | lista_precios | ver_por_bulto | ver_por_unidad | acceso_precompra | Gesu |
|------|--------|--------------|---------------|----------------|------------------|------|
| `consumidor_final` | Consumidor Final | `precio_lista5` | ❌ | ✅ | ❌ | Lista 5 |
| `distribuidor` | Distribuidor / Pool | `precio_lista1` | ✅ | ❌ | ✅ | Lista 1 |
| `local` | Local | `precio_lista2` | ❌ | ✅ | ❌ | Lista 2 |
| `mercha` | Merchandising | `precio_lista3` | ✅ | ✅ | ✅ | Lista 3 |
| `fabricantes` | Fabricantes | `precio_lista1` | ✅ | ❌ | ✅ | Lista 1 |

### Flujo de resolución de precios

1. **Registro:** `registro.ts` asigna `canal_id` + `aprobado=true` (consumidor_final) o `aprobado=false` (mayoristas).
2. **Resolución en cada request:** `resolverCanalTienda()` → `profiles.canal_id` → `canales.lista_precios` → string `"precio_lista3"` o `"precio_lista5"`.
3. **Query de productos:** todas las páginas seleccionan `precio_lista3, precio_lista5` de la tabla `productos`.
4. **Selección dinámica:** `producto[listaPrecio]` elige la columna correcta.
5. **Conversión:** `aplicarTipoCambio(precioRaw, moneda, tipoCambioUsd)` convierte USD → ARS.
6. **Formato:** `formatPrecio(n, moneda)` → `$ X.XXX` (es-AR).

---

## 2. Verificación por página — resolución de precios

| Página | Resuelve `listaPrecio` | Selecciona columna | Convierte USD | Formatea |
|--------|----------------------|--------------------|---------------|----------|
| Tienda `/tienda` | `tienda/page.tsx:35` | L54-55 | ✅ L57 | ✅ L58 |
| Búsqueda `/tienda?q=` | `tienda/page.tsx:35` | L54-55 | ✅ L57 | ✅ L58 |
| Categoría `/tienda/[slug]` | `[slug]/page.tsx:49` | `extraerPrecio()` L57-60 | ✅ L72 | ✅ L72 |
| Producto `/tienda/p/[id]` | `p/[id]/page.tsx:69` | L87-88 | ✅ L90 | ✅ L138 |
| Favoritos `/favoritos` | `favoritos/page.tsx:20` | L40-42 | ✅ L43 | ✅ — |
| Carrito `/carrito` | `carrito/page.tsx:22` (solo `mostrarPrecios`) | ⚠️ No recalcula | N/A | N/A |
| Slider "Más elegidos" | `tienda/page.tsx:99-105` | L102-103 | ✅ L104 | ✅ L89 |
| Grilla de productos | `ProductGridPublic.tsx` | Recibe `precio` ya resuelto | N/A | ✅ L192 |
| AddToCartButton | `AddToCartButton.tsx:51` | Recibe `precio` ya resuelto | N/A | N/A |

### Roles internos (sin canal)

| Rol | ¿Ve dashboard? | ¿Ve precios? | Lista que ve |
|-----|---------------|--------------|-------------|
| `master` | ✅ (full) | N/A | — |
| `empleado` | ✅ (limitado) | N/A | — |
| `comisionista` | ✅ (limitado) | N/A | — |

Los roles internos no pasan por `resolverCanalTienda()` en páginas públicas. En el panel admin ven `precio_lista3` y `precio_lista5` como columnas informativas.

---

## 3. Hallazgos — bugs confirmados

### CRÍTICO #1: `crearPedidoBorrador()` no valida precios en servidor

**Archivo:** `src/app/actions/pedidos.ts:25-31`

```ts
const total = lineas.reduce((acc, l) => acc + l.precioUnit * l.cantidad, 0)
```

El servidor acepta cualquier `precioUnit` enviado por el cliente. Un mayorista malicioso podría enviar `precioUnit: 0.01` y el pedido se crea con ese valor. No hay validación contra la DB.

**Comparación con `checkout.ts`:** `iniciarCheckoutMP()` sí resuelve precios desde la DB (L90: `precio_lista5`) y los usa. `crearPedidoBorrador` debería hacer lo mismo.

**Impacto:** Mayoristas pueden crear pedidos con precios falsos. El admin vería pedidos con totales irreales.

**Fix:** Resolver `canal_id` + `canales.lista_precios` del usuario, queryear productos con esa columna, y usar los precios de DB (no los del cliente).

> Ya documentado como bug #9 en AGENTS.md.

---

### CRÍTICO #2: Ofertas usan `precio_lista3` como referencia para TODOS los usuarios

**Archivos involucrados:**
- `src/app/actions/ofertas.ts:30` — queryea solo `precio_lista3`
- `src/app/actions/ofertas.ts:46` — `antes: prod?.precio_lista3 ?? 0`
- `src/app/dashboard/admin/ofertas/OfertasClient.tsx:72` — `const precioLista = producto.precio_lista3 ?? 0`
- `src/app/dashboard/admin/productos/ProductosListaClient.tsx:253` — `p.precio_lista3` al togglear oferta

Todo el sistema de ofertas está hardcodeado a `precio_lista3`. El drawer de ofertas/hotsale (`FloatingActions.tsx`) muestra estas ofertas a **todos** los usuarios (público, consumidores, mayoristas).

**Consecuencia para un consumidor final (Lista 5):**
- En la tienda ve: `$10,000` (precio_lista5)
- En el drawer de ofertas ve: "antes: $6,000" (precio_lista3) — un precio que **nunca vio** en la tienda
- Si `precio_oferta > precio_lista3`, el "antes" es menor que el precio de oferta (descue

nto negativo visual)

**Fix posible:** Agregar columna `lista_referencia` a la tabla `ofertas` para que el admin elija contra qué lista comparar (`precio_lista3` o `precio_lista5`). O filtrar ofertas por canal del viewer y usar la lista que corresponde a ese canal.

> Ya documentado como bug #8 en AGENTS.md.

---

### MEDIO #3: Ofertas no filtran por canal de venta del usuario

**Archivo:** `src/components/sections/FloatingActions.tsx:22`

```ts
const filtered = items.filter(i => i.canal === type)
```

Filtra por tipo de drawer (`'ofertas'` / `'hotsale'`), no por el canal de venta del viewer. Si en el futuro se quiere crear ofertas exclusivas para mayoristas o minoristas, este filtro no las separa.

**Fix:** Agregar columna `canal_id` a la tabla `ofertas` (o un array de canales destino), y filtrar en el cliente por el canal del viewer.

---

### MEDIO #4: Carrito no recalcula precios server-side

**Archivo:** `src/app/(public)/carrito/page.tsx:8-24`

```ts
const { mostrarPrecios } = await resolverCanalTienda()
return <CartClient user={pageUser} mostrarPrecios={mostrarPrecios} />
```

El servidor solo pasa `mostrarPrecios`. Los precios en el carrito vienen de Zustand (`localStorage`), guardados al momento de agregar el producto. Si un admin cambia el `canal_id` de un usuario, los precios en el carrito quedan stale.

**Impacto bajo** en producción (los cambios de canal son raros), pero es una debilidad de diseño.

**Fix:** En `carrito/page.tsx`, re-leer los precios desde DB para cada ítem del carrito usando la lista del usuario y pasarlos al cliente, que actualice el store.

---

### BAJO #5: Columna `moneda` del sync se toma de Lista 1, no de la lista del viewer

**Archivo:** `src/app/api/sync/productos/route.ts:167`

```ts
moneda: item.monedaPrecioLista1 || item.monedaPrecioLista5 || '$',
```

Si hipotéticamente Lista1 estuviera en USD y Lista5 en ARS, los consumidores verían precios incorrectos tras la conversión. En la práctica no ocurre (todas las listas del mismo producto usan la misma moneda en Gesu), pero el código es frágil.

**Fix:** Tomar `moneda` de la lista que usa el viewer (`precio_lista3` o `precio_lista5`), no de Lista1. O mejor: normalizar en Gesu para que todas las listas tengan la misma moneda.

---

### NOTA: Canal `fabricantes`

**Archivo:** `supabase/migrations/20260603000002_canal_fabricantes.sql`

Existe con `lista_precios = 'precio_lista1'` pero no tiene rol correspondiente en `profiles`. Solo se asigna manualmente desde admin. Si un admin asigna este canal a un usuario con `aprobado=true`, el usuario vería `precio_lista1`. Esto es por diseño — los fabricantes son casos especiales manejados manualmente.

---

## 4. Verificaciones — cosas que SÍ están bien

| Verificación | Archivo | Resultado |
|---|---|---|
| `resolverCanalTienda()` mapea rol → canal → lista_precios | `lib/tienda.ts:25-85` | ✅ |
| Fallback sin sesión → consumidor_final → precio_lista5 | `lib/tienda.ts:88-97` | ✅ |
| Mayorista sin aprobar → pendienteAprobacion → PendingApproval | `lib/tienda.ts:78-79` | ✅ |
| `aprobarCliente()` auto-asigna canal_id matcheando rol ↔ slug | `actions/clientes.ts:19-26` | ✅ |
| Registro consumidor_final → aprobado=true + canal_id | `actions/registro.ts:54-62` | ✅ |
| OAuth callback → nuevo usuario → consumidor_final + canal_id | `auth/callback/route.ts:66-74` | ✅ |
| `checkout.ts` solo permite MP a `consumidor_final` y guests | `actions/checkout.ts:37` | ✅ |
| `checkout.ts` usa `precio_lista5` (correcto para ese flujo) | `actions/checkout.ts:90` | ✅ |
| `checkout.ts` valida múltiplos server-side | `actions/checkout.ts:70-84` | ✅ |
| Todas las páginas de tienda queryean `precio_lista3` Y `precio_lista5` | `tienda/page.tsx:45`, `[slug]/page.tsx:55`, `p/[id]/page.tsx:76` | ✅ |
| `getProductosDelCanal()` filtra por `producto_canales` con múltiplo | `lib/tienda.ts:103-115` | ✅ |
| RLS productos: cliente aprobado solo ve productos de su canal | `migrations/20260418000003:174-183` | ✅ |
| AddToCartButton recibe precio resuelto server-side | `tienda/p/[id]/page.tsx:171-180` | ✅ |
| CartDrawer: "Enviar pedido" solo para mayoristas aprobados | `CartDrawer.tsx:172-188` | ✅ |
| CartClient: MP para minoristas, WhatsApp para mayoristas | `CartClient.tsx:348-378` | ✅ |
| ProductGridPublic respeta `mostrarPrecios` (oculta a no aprobados) | `ProductGridPublic.tsx:215-259` | ✅ |
| ProductSlider "Más elegidos" resuelve precios con lista correcta | `tienda/page.tsx:99-105` | ✅ |

---

## 5. Resumen de bugs ordenados por prioridad

| # | Prioridad | Descripción | Archivo(s) |
|---|-----------|-------------|------------|
| 1 | 🔴 Crítico | `crearPedidoBorrador()` no valida precios en servidor | `actions/pedidos.ts:25` |
| 2 | 🔴 Crítico | Ofertas muestran `precio_lista3` como referencia a todos los usuarios | `actions/ofertas.ts:30,46` + `FloatingActions.tsx:83` + `OfertasClient.tsx:72` |
| 3 | 🟡 Medio | Ofertas no filtran por canal de venta del viewer | `FloatingActions.tsx:22` + `actions/ofertas.ts:19-22` |
| 4 | 🟡 Medio | Carrito no recalcula precios server-side | `carrito/page.tsx:8-24` |
| 5 | 🟢 Bajo | Columna `moneda` del sync se toma de Lista1 | `api/sync/productos/route.ts:167` |

---

## 6. Recomendaciones para el fix

### Para bug #1 (crítico)
Hacer que `crearPedidoBorrador()` replique la lógica de validación de `iniciarCheckoutMP()`:
- Resolver `canal_id` y `lista_precios` del usuario autenticado
- Queryear productos con la columna de precios correcta
- Validar múltiplos
- Usar los precios de DB, no los del cliente

### Para bug #2 (crítico)
Dos enfoques posibles:
- **Opción A (simple):** Agregar columna `lista_referencia` (`'precio_lista3' | 'precio_lista5'`) a la tabla `ofertas`. El admin elige contra qué lista comparar al crear la oferta. El drawer usa esa referencia.
- **Opción B (correcta pero más trabajo):** Queryear la lista que corresponde al viewer y calcular "antes" dinámicamente en `FloatingActions.tsx`. Requiere pasar el viewer context al drawer.

### Para bug #3 (medio)
Agregar columna `canal_id` (FK a `canales.id`, nullable = visible para todos) a la tabla `ofertas`. Filtrar en `FloatingActions.tsx` por el canal del viewer (o mostrar todas si es null).
