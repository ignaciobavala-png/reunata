# Auditoría: Fallbacks, Pantallas de Carga y Manejo de Errores

**Fecha:** 2026-06-19
**Alcance:** `src/app/` (143 archivos), `src/components/` (35+ archivos), `src/lib/` (6 archivos)

---

## Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| `loading.tsx` en todo el proyecto | **0** |
| Uso de `<Suspense>` en todo el proyecto | **0** |
| `error.tsx` en todo el proyecto | **2** (solo root `error.tsx` y `global-error.tsx`) |
| `not-found.tsx` en todo el proyecto | **1** |
| Componentes reutilizables de loading (Spinner/Skeleton) | **0** (solo `Loader2` de lucide-react inline) |
| `AbortController` en todo `src/components/` | **0** |
| Archivos con `async/await` o `.then()` | **125** |
| Páginas server con `async function` sin loading | **22** |
| Componentes cliente con fetch sin loading/error | **5** |
| Bugs SSR (`createClient()` a nivel módulo) | **2** |

**Diagnóstico:** El proyecto no usa ninguna de las capacidades de streaming/loading de Next.js. Toda página con datos asíncronos bloquea el HTML completo hasta que todas las queries resuelven. En conexiones lentas o ante fallos de Supabase, el usuario ve pantalla blanca sin feedback.

---

## 1. Problemas Estructurales (Layouts — Bloquean todo)

### 1.1 `src/app/layout.tsx` (Root Layout) — CRÍTICO

```ts
// Es async. Si esta query falla o tarda, el HTML shell entero se bloquea.
const { data: themeRows } = await supabase.from("configuracion").select("...");
```

- **Qué bloquea:** `<html>`, `<body>`, fonts, CSS, metadata — todo.
- **Sin loading posible:** No hay `loading.tsx` que pueda cubrir el root layout. El `error.tsx` está *dentro* de este layout, así que si el layout mismo falla, no hay error boundary que lo atrape.
- **Fix propuesto:** Mover la query de `configuracion` a `ThemeProvider` (cliente), con fallback a defaults CSS. El layout root debe ser sincrónico.

### 1.2 `src/app/(public)/layout.tsx` (Layout público) — CRÍTICO

```ts
const { data: { user } } = await supabase.auth.getUser();        // await 1
const { data: profile } = await supabase.from("profiles")...;    // await 2
const { data: categorias } = await supabase.from("categorias")...; // await 3
```

- **Qué bloquea:** Todas las rutas bajo `(public)/`: `/tienda`, `/carrito`, `/nosotros`, `/catalogo`, `/favoritos`, `/pedidos`, etc.
- **3 awaits secuenciales** que corren en cada request a cualquier ruta pública.
- **Fix propuesto:** Envolver el contenido en `<Suspense>` y delegar la carga de header a un componente cliente con fallback.

### 1.3 `src/app/dashboard/layout.tsx` (Layout admin) — ALTO

```ts
const client = await createClient();                              // await 1
const { data: { user } } = await client.auth.getUser();          // await 2
const { data: profile } = await client.from("profiles")...;      // await 3
const [{ count: countRecontacto }, { count: countCredito }] =   // await 4-5
  await Promise.all([...]);
```

- **Qué bloquea:** Todo el dashboard (`/dashboard/admin/*`, `/dashboard/cliente/*`).
- **Fix propuesto:** `<Suspense>` + `loading.tsx` en `dashboard/`. Mover badges (recontacto, financiación) a componentes cliente con fetch independiente.

---

## 2. Páginas Server sin `loading.tsx` — Riesgo Alto

Cada una bloquea el render hasta que todas sus queries resuelven. Sin feedback visual.

| Ruta | Archivo | Awaits | Detalle |
|------|---------|:------:|---------|
| `/` | `src/app/page.tsx` | 6+ | 4 paralelos (canal, categorias, banner, instagram) + 2 secuenciales (idsCanal, fotosDestacadas) |
| `/tienda` | `src/app/(public)/tienda/page.tsx` | 5+ | Canal, ids, productos, + branch condicional de búsqueda |
| `/tienda/[slug]` | `src/app/(public)/tienda/[slug]/page.tsx` | 5+ | `generateMetadata` (2 awaits) + página (canal → ids → novedades → productos condicionales) |
| `/tienda/p/[id]` | `src/app/(public)/tienda/p/[id]/page.tsx` | 4 | `generateMetadata` (1) + canal → ids → producto → categoría |
| `/catalogo` | `src/app/(public)/catalogo/page.tsx` | 5+ | Canal → preview → canal info → config → productos (waterfall secuencial) |
| `/favoritos` | `src/app/(public)/favoritos/page.tsx` | 4+ | Canal → auth → favoritos → idsCanal → productos |
| `/nosotros` | `src/app/(public)/nosotros/page.tsx` | 1 | Configuración (liviana, riesgo medio) |
| `/faq` | `src/app/(public)/faq/page.tsx` | 1 | Configuración FAQ items (tiene try/catch en JSON.parse — buen patrón parcial) |
| `/banco-imagenes` | `src/app/(public)/banco-imagenes/page.tsx` | 2+1 cond | Config + auth + profile condicional |
| `/cuenta` | `src/app/(public)/cuenta/page.tsx` | 2 | getUser + profile (delega a `CuentaForm` cliente — ok) |
| `/pedidos` | `src/app/(public)/pedidos/page.tsx` | 2 | getUser + pedidos |
| `/pedidos/[id]` | `src/app/(public)/pedidos/[id]/page.tsx` | 3 | getUser + pedido + config |
| `/corporativos` | `src/app/(public)/corporativos/page.tsx` | 1 | getFotos() helper |
| `/checkout/exito` | `src/app/(public)/checkout/exito/page.tsx` | 2 | searchParams + getUser |
| `/checkout/pendiente` | `src/app/(public)/checkout/pendiente/page.tsx` | 2 | searchParams + getUser |
| `/dashboard/admin` | `src/app/dashboard/admin/page.tsx` | 5 | `getStats()` con 4 queries paralelas + 1 secuencial |
| `/dashboard/admin/productos` | `src/app/dashboard/admin/productos/page.tsx` | 9 | **Peor caso:** 9 queries paralelas (productos, ofertas, fotos, novedades, canales, asignaciones, configs). Sin paginación. |
| `/dashboard/admin/multimedia` | `src/app/dashboard/admin/multimedia/page.tsx` | 4 | 4 queries paralelas (categorias, heroAssets, gesuCatsRaw, heroConfig) + sub-vistas complejas |
| `/dashboard/admin/clientes` | `src/app/dashboard/admin/clientes/page.tsx` | 2 | Todos los perfiles + todos los canales (datasets potencialmente grandes) |
| `/dashboard/admin/catalogos` | `src/app/dashboard/admin/catalogos/page.tsx` | 3 | 3 queries + N signed URLs en paralelo (1 por PDF) |
| `/dashboard/admin/financiacion` | `src/app/dashboard/admin/financiacion/page.tsx` | 4 | Join query entre solicitudes y profiles |
| `/dashboard/admin/recontacto` | `src/app/dashboard/admin/recontacto/page.tsx` | 4 | Join query profiles + canales + canales_config |
| `/dashboard/cliente` | `src/app/dashboard/cliente/page.tsx` | 5 | getUser + profile + Promise.all(pedidos + canal) |

**Páginas estáticas sin riesgo:** `/eventos`, `/franquicias`, `/faq` (si no usa await), `/terminos`, `/politicas`, `/promociones`, `/puntos-de-venta`, `/seguimiento`, `/historial`, `/arrepentimiento`, `/contacto`, `/trabaja-con-nosotros`, `/colecciones` (redirect), `/checkout/fallo`.

---

## 3. Componentes Cliente con Fallbacks Faltantes

### 3.1 `CategoryGallery.tsx` — ALTO

- **Fetch:** `useEffect` → `supabase.from('categorias_home')` → `supabase.from('productos')`
- **Loading:** No tiene. Renderiza `null` hasta que los datos llegan → **sección en blanco durante carga**.
- **Error:** No tiene `.catch()`. Si la query falla, `categorias` queda `[]` y la sección desaparece silenciosamente.
- **Cleanup:** No tiene `AbortController` ni mounted flag. Si el componente se desmonta antes de que la promesa resuelva, `setCategorias` llama a setState en unmounted component.

### 3.2 `FloatingActions.tsx` — MEDIO

- **Fetch:** `useEffect` → `getOfertasPublic().then(setItems).catch(console.error)`
- **Loading:** No tiene. Si el drawer se abre antes de que los datos lleguen, muestra **"No hay productos"** (engañoso — debería mostrar loading).
- **Error:** Solo `console.error`. Si la query falla, muestra "No hay productos por el momento" permanentemente (indistinguible de un estado vacío real).

### 3.3 `PromoTicker.tsx` — MEDIO

- **Fetch:** `useEffect` → `supabase.from('configuracion')` para `promo_items` y `promo_speed`
- **Loading:** Usa flag `ready`. Renderiza `null` hasta que está listo. El problema: primero pinta con `DEFAULT_ITEMS` (brevemente), luego desaparece, luego reaparece con datos de DB → **flicker visible**.
- **Error:** `try {} catch {}` vacío. Si la query falla, `ready` nunca se pone `true` y el ticker desaparece para siempre.
- **Cleanup:** Sin `AbortController` ni mounted flag.

### 3.4 `ThemeProvider.tsx` — MEDIO

- **Fetch:** `useEffect` → `supabase.from('configuracion')` para color pickers
- **Loading:** No tiene. Aplica CSS vars asíncronamente → **FOUC (flash of unstyled colors)** en carga lenta.
- **Error:** Sin `.catch()`. Si falla, la página usa colores default (aceptable como degradación).
- **Cleanup:** Sin `AbortController`. La side effect es sobre `documentElement` (persiste entre mounts), así que el cleanup de React state es menos crítico.

### 3.5 `ProductGridPublic.tsx` — MEDIO

- **Fetch:** `useEffect` → `supabase.from('favoritos')` (solo si `estaLogueado`)
- **Loading:** No tiene para favoritos. Los corazones aparecen como no-favoreados inicialmente, luego cambian cuando los datos llegan → **parpadeo visual**.
- **Error:** Sin `.catch()`. Si falla, favoritos quedan vacíos silenciosamente.
- **Cleanup:** Sin `AbortController` para el fetch de favoritos.

---

## 4. Bugs de Error Handling

### 4.1 `CuentaForm.tsx` (server action ignorado)

```ts
// actualizarPerfil() retorna { error } pero se ignora
const result = await actualizarPerfil(formData);
// Siempre redirige con ?guardado=1, incluso si falló
router.push("/dashboard/cliente/cuenta?guardado=1");
```

- **Impacto:** El usuario cree que guardó correctamente cuando en realidad falló.

### 4.2 `CartClient.tsx` (errores de red silenciosos)

```ts
fetch("/api/carrito/precios", { ... }).catch(() => {});   // silencioso
fetch("/api/carrito/reglas", { ... }).catch(() => {});     // silencioso
fetch("/api/cuenta/direcciones", { ... }).catch(() => {});  // silencioso
```

- **Impacto:** Si `/api/carrito/precios` falla, los precios en el carrito quedan stale sin que el usuario lo sepa.

### 4.3 `dashboard/admin/configuracion/page.tsx` (upsert sin check)

```ts
const { error } = await supabase.from("configuracion").upsert(...);
// No se verifica error antes de redirect
redirect("/dashboard/admin/configuracion?guardado=1");
```

- **Impacto:** El admin ve mensaje de éxito aunque el upsert haya fallado.

### 4.4 `InstagramSlider.tsx` (imágenes rotas silenciosas)

- Las URLs de posts de Instagram pueden fallar. No hay `onError` en `<Image>` para fallback.

---

## 5. Bugs SSR (`createClient()` a nivel módulo)

La convención del proyecto (AGENTS.md) prohíbe explícitamente `createClient()` fuera de `useEffect`/`useRef`. Estos dos archivos lo violan:

| Archivo | Línea | Riesgo |
|---------|-------|--------|
| `src/app/(public)/pedidos/[id]/ComprobanteUploader.tsx` | 13 | Turbopack ejecuta en servidor → error SSR |
| `src/app/dashboard/admin/multimedia/HeroClient.tsx` | 42 | Turbopack ejecuta en servidor → error SSR |

Patrón correcto:
```ts
const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
function getSupabase() {
  if (!supabaseRef.current) supabaseRef.current = createClient();
  return supabaseRef.current;
}
```

---

## 6. Componente `FinanciacionClient.tsx` — Leak de setTimeout

```ts
// src/app/(public)/cuenta/financiacion/FinanciacionClient.tsx:50
setTimeout(() => setExito(false), 4000);
```

Sin cleanup. Si el componente se desmonta antes de 4s, `setExito` llama a setState en unmounted component.

---

## 7. Plan de Acción

### Fase 1: Estructural (mayor impacto en UX)

| # | Archivo | Acción |
|---|---------|--------|
| 1.1 | `src/app/layout.tsx` | Extraer query de `configuracion` a `ThemeProvider` (ya existe). Layout root debe ser sincrónico o devolver shell inmediato con `<Suspense>`. |
| 1.2 | `src/app/(public)/layout.tsx` | Envolver children en `<Suspense fallback={...}>`. Mover carga de `getUser`/profile/categorias a un `HeaderDataLoader` cliente o usar `loading.tsx`. |
| 1.3 | `src/app/dashboard/layout.tsx` | Crear `src/app/dashboard/loading.tsx`. Mover badges de recontacto/financiacion a componentes cliente independientes. |

### Fase 2: `loading.tsx` por ruta

| # | Ruta | Archivo a crear |
|---|------|-----------------|
| 2.1 | `/` | `src/app/loading.tsx` |
| 2.2 | `/tienda` | `src/app/(public)/tienda/loading.tsx` |
| 2.3 | `/tienda/[slug]` | `src/app/(public)/tienda/[slug]/loading.tsx` |
| 2.4 | `/tienda/p/[id]` | `src/app/(public)/tienda/p/[id]/loading.tsx` |
| 2.5 | `/catalogo` | `src/app/(public)/catalogo/loading.tsx` |
| 2.6 | `/favoritos` | `src/app/(public)/favoritos/loading.tsx` |
| 2.7 | `/dashboard/admin/productos` | `src/app/dashboard/admin/productos/loading.tsx` |
| 2.8 | `/dashboard/admin/multimedia` | `src/app/dashboard/admin/multimedia/loading.tsx` |

### Fase 3: Componentes cliente

| # | Componente | Acción |
|---|-----------|--------|
| 3.1 | `CategoryGallery.tsx` | Agregar `loading`/`error` states + `AbortController` |
| 3.2 | `FloatingActions.tsx` | Agregar loading state, diferenciar error de vacío |
| 3.3 | `PromoTicker.tsx` | Mostrar defaults inmediatamente, transicionar sin desaparecer |
| 3.4 | `ThemeProvider.tsx` | Agregar `isLoaded` state + clase CSS para prevenir FOUC |
| 3.5 | `ProductGridPublic.tsx` | Agregar loading para fetch de favoritos |
| 3.6 | **Nuevo:** `src/components/ui/Spinner.tsx` | Componente reutilizable de spinner |
| 3.7 | **Nuevo:** `src/components/ui/Skeleton.tsx` | Componente reutilizable de skeleton |

### Fase 4: Bugs puntuales

| # | Archivo | Acción |
|---|---------|--------|
| 4.1 | `ComprobanteUploader.tsx:13` | Mover `createClient()` a `useRef` |
| 4.2 | `HeroClient.tsx:42` | Mover `createClient()` a `useRef` |
| 4.3 | `CuentaForm.tsx` | Chequear `result.error` antes de redirigir |
| 4.4 | `CartClient.tsx` | Reemplazar `.catch(() => {})` con toast de error + retry |
| 4.5 | `configuracion/page.tsx` | Chequear `.error` del upsert antes de redirect |
| 4.6 | `FinanciacionClient.tsx:50` | Guardar timeout ID y cleanup en useEffect return |
| 4.7 | `InstagramSlider.tsx` | Agregar `onError` handler a `<Image>` |
| 4.8 | `Dashboard dir` | Agregar `error.tsx` por segmento (`dashboard/error.tsx`) para aislar errores del dashboard del root error boundary |

---

## 8. Checklist de Verificación

Al implementar cada fix, verificar:

- [ ] `loading.tsx` se renderiza durante carga (no solo en navegación inicial)
- [ ] `error.tsx` captura errores del segmento (probar tirando `throw new Error` en la page)
- [ ] Componentes cliente con fetch tienen `AbortController` o flag `useRef(true)` para evitar setState en unmounted
- [ ] `createClient()` nunca se ejecuta a nivel módulo (salvo en server components)
- [ ] Estados de error son visualmente distintos de estados vacíos
- [ ] No hay flicker: el loading state aparece inmediatamente, no después de un primer render en blanco
