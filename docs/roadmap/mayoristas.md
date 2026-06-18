# Plan: WEB BACK — Trato a Mayoristas

> Basado en `WEB BACK Configuracion.docx` (11/06/2026)
> Proyecto: Reunata — Marketplace Mayorista de Mate
> Rama: `mayoristas`

---

## Estado general

| Fase | Estado | Commits |
|---|---|---|
| A — Motor de reglas de pago | ✅ Completa | `96087f8`, `f3c8a70` |
| B — Carrito con impacto dinámico | ✅ Completa | `cd421eb` |
| C — Financiación + direcciones | ✅ Completa | `cd421eb` |
| D — Premios por fidelidad | ⏳ Pendiente | — |
| E — Ajustes de marketing | ⏳ Pendiente | — |

**Extra (fuera del plan original):**
- Fix bug H (lista1/lista2 en precios): `f3c8a70`
- Estandarización imágenes 3:4: `1619a70`

---

## Fase A — Motor de reglas de pago ✅

### Implementado

**Tabla `canales_config`** (migración aplicada a producción):
- `canal_id` FK, `pagos_habilitados` jsonb, `minimo_compra`, `desc_efectivo_pct`, `recargo_transf_blanco_pct`, `desc_autogestion_primera_pct`, `desc_autogestion_siguientes_pct`, `envio_gratis_desde`
- RLS: solo master/empleado puede escribir; service client para reads en actions

**Panel admin** — integrado como tab "Canales" dentro de `/dashboard/admin/productos`:
- La página standalone `/dashboard/admin/canales` fue eliminada
- `CanalesListaClient` + `CanalConfigDrawer` — edición de config por canal
- Badge "Especial" para canal `fabricantes`

**Endpoint** `GET /api/carrito/reglas`:
- Recibe sesión del usuario → resuelve su `canal_id` → devuelve `canales_config` completa

### No implementado de la fase original
- `codigos_descuento` — tabla y panel (pendiente)
- `gift_cards` — tabla y panel (pendiente)

---

## Fase B — Carrito con impacto dinámico ✅

### Implementado en `CartClient.tsx`

- **Selector de método de pago** — radio buttons para métodos habilitados según `canales_config.pagos_habilitados`
- **Ajuste de precio dinámico** — `desc_efectivo_pct` baja el total; `recargo_transf_blanco_pct` lo sube
- **Advertencia de mínimo** — bloquea el botón de envío si el total no alcanza `minimo_compra`
- **Botón WhatsApp dinámico** — incluye método de pago elegido y total final en el mensaje

**Constantes en CartClient:**
```ts
const METODOS_CONTADO = ['efectivo', 'transferencia', 'echeq_propio', 'echeq_tercero', 'cheque_fisico']
const METODO_LABEL: Record<string, string> = { ... }
```

### No implementado de la fase original
- Input de código de descuento (requiere tabla `codigos_descuento`)
- Input de gift card (requiere tabla `gift_cards`)
- Descuento autogestión web (requiere `compras_realizadas` en profiles)
- Banner dinámico de medios de pago (sigue siendo PNG estático para minoristas/guests)

---

## Fase C — Financiación + direcciones ✅

### DB (migración `20260618000002_phase_c_credito_direcciones.sql`)

**`solicitudes_credito`:**
- `id`, `cliente_id` FK, `monto`, `plazo_dias`, `garantias`, `notas`, `estado` CHECK(`pendiente|aprobado|rechazado|cancelado`), `respuesta`, timestamps
- RLS: cliente ve las propias (ALL); master/empleado ve todas (ALL)

**`direcciones_entrega`:**
- `id`, `cliente_id` FK, `alias`, `calle`, `numero`, `piso`, `localidad`, `provincia`, `codigo_postal`, `predeterminada`, `activa` (soft delete), `created_at`
- RLS: cliente ve las propias (ALL); master/empleado ve todas (SELECT)

**`pedidos.direccion_entrega_id`:** FK nullable → `direcciones_entrega(id) ON DELETE SET NULL`

### Server actions

`src/app/actions/direcciones.ts`:
- `crearDireccion(formData)` — valida campos, maneja `predeterminada` con exclusión mutua
- `actualizarDireccion(id, formData)`
- `eliminarDireccion(id)` — soft delete (`activa = false`)
- `marcarPredeterminada(id)` — unset all → set one

`src/app/actions/financiacion.ts`:
- `crearSolicitudCredito(formData)` — bloquea si ya hay una `pendiente`
- `cancelarSolicitudCredito(id)` — solo para estado `pendiente`
- `responderSolicitudCredito(id, estado, respuesta)` — master/empleado con `createServiceClient()`

### UI para mayoristas

**`/cuenta/direcciones`** (`DireccionesClient.tsx`):
- Lista + inline edit + create form
- Estrella para predeterminada, confirmación antes de eliminar
- Selector de 24 provincias argentinas

**`/cuenta/financiacion`** (`FinanciacionClient.tsx`):
- Form: monto, plazo_dias (30/60/90/120), garantías, notas
- Bloqueo si tiene una pendiente
- Historial con badges por estado, cancelación de pendientes

**`CuentaNav.tsx`** — tabs Mi cuenta / Direcciones / Financiación (solo mayoristas)

### API

`GET /api/cuenta/direcciones` — devuelve direcciones activas del usuario, ordenadas por predeterminada

### Admin

**`/dashboard/admin/financiacion`** (`FinanciacionAdminClient.tsx`):
- Tabs: En revisión (con contador) / Aprobadas / No aprobadas / Todas
- Filas expandibles con detalle del cliente
- Aprobar / No aprobar con respuesta opcional
- Entrada en Sidebar bajo grupo Ventas (`CreditCard` icon)

### CartClient — selector de dirección

Para mayoristas, sección adicional en el carrito:
- Dropdown de direcciones propias (auto-selecciona predeterminada)
- Link "Gestionar" → `/cuenta/direcciones`
- La dirección seleccionada se incluye en el mensaje de WhatsApp

### Diferencias con el plan original
- El plan pedía referencias comerciales, CBU, archivos CUIT/estatuto. Se implementó una versión simplificada (monto, plazo, garantías texto, notas). Los campos adicionales quedan para cuando haya claridad de Gastón sobre qué información mínima necesita.
- No se implementó notificación push/email al admin al recibir solicitud (pendiente)

---

## Fase D — Premios por fidelidad ⏳

**Objetivo:** recompensar clientes frecuentes con descuentos automáticos.

### Tabla `metricas_cliente` (por crear)
Acumuladores calculados por cron:

| Columna | Descripción |
|---|---|
| `cliente_id` | FK → auth.users |
| `periodo` | `mensual` o `trimestral` |
| `fecha_inicio` / `fecha_fin` | Rango del período |
| `diversidad_items` | SKU distintos comprados |
| `monto_total` | Monto total de compras |
| `cantidad_pedidos` | Pedidos en el período |
| `dias_entre_pedidos` | Promedio entre pedidos |

### Extensiones a `canales_config`
Columnas a agregar:
- `premio_diversidad_items_min` / `premio_diversidad_pct`
- `premio_monto_trimestral_min` / `premio_monto_trimestral_pct`
- `premio_periodicidad_dias_max` / `premio_periodicidad_pct`

### UI
- En carrito: banner "Premio fidelidad: -X% (compraste Y ítems distintos este mes)"
- En `/cuenta`: sección "Tus beneficios" con progreso hacia el próximo premio

**Complejidad:** Alta — tracking histórico + queries agregadas + cron

---

## Fase E — Ajustes de marketing ⏳

**Objetivo:** herramientas de recontacto y agendamiento.

### Extensiones a `configuracion`
- `marketing_dias_inactivo_recontacto` — días sin compra para marcar como inactivo (default 90)
- `marketing_mensaje_recontacto` — texto del mensaje WhatsApp/email
- `marketing_link_agendamiento` — URL de Calendly/Google Calendar

### Extensiones a `profiles`
- `ultima_compra_en` — fecha del último pedido completado
- `requiere_recontacto` — boolean, seteado por cron

### Cron job
- 1 vez por día: detecta clientes sin compras en X días → `requiere_recontacto = true`
- Badge en sidebar: "N clientes para recontactar"
- Lista en admin con botón WhatsApp directo

**Complejidad:** Baja

---

## Pendientes / bugs conocidos post-implementación

| # | Archivo | Issue |
|---|---|---|
| — | `solicitudes_credito` | No se notifica al admin cuando llega solicitud nueva (email/push pendiente) |
| — | `CartClient` | Códigos de descuento y gift cards (requieren Fase A completa) |
| — | `profiles` | `bonificacion` existe pero no se usa en ningún cálculo |
| #11 | `lib/tienda.ts` | Write de auto-reparación `consumidor_final` ocurre en cada request |
| #13 | `auth/callback/route.ts` | Usar `.upsert()` en lugar de `.update()` |
| F5/B6 | `carrito/CartClient.tsx` | Precios no se refrescan contra DB al cargar el carrito |

---

## Convenciones a respetar

- `proxy.ts` — no `middleware.ts`
- `createClient()` nunca a nivel módulo, siempre en `useEffect`/`useRef`
- `createServiceClient()` para acciones admin
- Zustand: flag `mounted` en toda UI que dependa de `cartStore`
- Precios en ARS con `formatPrecio()`
- Fotos de producto: **3:4** en todos los showcases, **1:1** solo en thumbnails de carrito
- `pnpm tsc --noEmit` antes de commitear
- **NO hacer push sin que el usuario lo pida explícitamente**

---

## Notas de diseño

- "Contado" vs "Financiado" son categorías de métodos, no métodos en sí. Los métodos individuales (efectivo, transferencia, e-cheq) pertenecen a cada categoría.
- Los premios por fidelidad (Fase D): calcular con cron diario + caché en `metricas_cliente`, no on-the-fly.
- La simplificación del formulario de crédito (Fase C) es deliberada. Cuando Gastón defina qué campos mínimos necesita, se extiende la tabla con una migración.
