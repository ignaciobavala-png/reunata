# Enviopack — Integración de envíos

Documentación técnica de la integración con [Enviopack](https://www.enviopack.com.ar/).

Referencia oficial: https://ayuda.enviopack.com/es/articles/10581840-integra-tu-tienda-propia-o-software

---

## Estado actual

### ✅ Implementado — Cotización (fase 1)

La cotización de envíos está completamente funcional antes del lanzamiento:

| Componente | Archivo |
|---|---|
| Librería de cotización | `src/lib/enviopack.ts` |
| Endpoint API con rate limiting | `src/app/api/envio/cotizar/route.ts` |
| Widget cotizador en carrito | `src/components/cliente/EnvioCotizador.tsx` |
| Integrado en `CartClient` | `src/app/(public)/carrito/CartClient.tsx:398` |
| Re-verificación server-side al checkout | `src/app/actions/checkout.ts:141` |
| Panel de dimensiones por producto (admin) | `src/components/admin/ProductoFichaDrawer.tsx` tab "Envío" |
| `guardarDimensionesEnvio()` | `src/app/actions/productos.ts:30` |

**Flujo implementado:**
```
Cliente agrega productos → va al carrito → ingresa provincia + CP
→ /api/envio/cotizar (llama Enviopack a-domicilio) → elige opción
→ checkout re-cotiza server-side → crea pedido con costo_envio
→ genera preferencia MP con (subtotal + envío) como ítem separado
```

**Columnas ya en `pedidos`:** `costo_envio`, `envio_descripcion`

**Columnas ya en `productos`:** `peso`, `alto`, `ancho`, `largo`, `enviar_solo`

**Visibilidad:** el cotizador aparece solo para `consumidor_final` y guests. Mayoristas coordinan por WhatsApp, sin envío cotizado.

**Variable de entorno necesaria:** `ENVIOPACK_ACCESS_TOKEN` (access token de la cuenta Enviopack)

---

### ❌ No implementado — Creación de envíos post-pago (fase 2)

Cuando el webhook de MP confirma un pago aprobado, **Enviopack no se entera**. El pedido queda en DB con el costo de envío pero sin etiqueta ni tracking.

**Por ahora:** gestión manual desde el panel de Enviopack (`app.enviopack.com`) usando los datos del pedido.

---

## Gap pendiente antes de automatizar

Al crear el pedido en DB, se guarda `costo_envio` y `envio_descripcion` pero **no el CP ni la provincia de destino**. Esos datos son necesarios tanto para la gestión manual como para la automatización futura.

### Migración necesaria

```sql
ALTER TABLE pedidos
  ADD COLUMN envio_codigo_postal text,
  ADD COLUMN envio_provincia     text;
```

### Cambio en checkout

En `src/app/actions/checkout.ts`, al insertar el pedido, agregar:

```ts
envio_codigo_postal: envioParams?.codigo_postal ?? null,
envio_provincia:     envioParams?.provincia ?? null,
```

> Esto es un fix chico pero importante para no perder información operativa desde el primer pedido.

---

## Fase 2 — Automatización post-pago (pendiente)

Cuando se quiera automatizar, el flujo completo es:

```
Webhook MP status=approved
  → buscar pedido en DB (ya existe este paso)
  → llamar POST https://api.enviopack.com/envios con:
      - datos del destinatario (nombre, email, teléfono)
      - dirección: envio_codigo_postal + envio_provincia (+ calle/número que no tenemos aún)
      - servicio: servicioId guardado en pedido
      - paquetes: peso/dims de cada producto × cantidad
  → guardar enviopack_envio_id + nro_seguimiento en pedido
  → (opcional) enviar email al cliente con tracking
```

### Columnas adicionales para fase 2

```sql
ALTER TABLE pedidos
  ADD COLUMN envio_calle            text,
  ADD COLUMN envio_numero           text,
  ADD COLUMN envio_piso             text,
  ADD COLUMN envio_localidad        text,
  ADD COLUMN enviopack_envio_id     text,
  ADD COLUMN envio_nro_seguimiento  text;
```

Estas columnas requieren también agregar un formulario de dirección completa en el carrito antes del pago (hoy solo se pide CP + provincia para cotizar).

---

## Autenticación con Enviopack

El access token actual (`ENVIOPACK_ACCESS_TOKEN`) se obtiene desde el panel de Enviopack y se usa directamente en la cotización como query param.

Para la fase 2 (crear envíos), la API usa `Bearer token` en el header, obtenido via:

```
POST https://api.enviopack.com/auth
{ "api-key": "...", "secret-key": "..." }
→ { "token": "eyJ..." }  // JWT, dura 4 horas
```

Variables de entorno adicionales para fase 2:
```
ENVIOPACK_API_KEY=...
ENVIOPACK_SECRET_KEY=...
ENVIOPACK_CP_ORIGEN=...   # CP del depósito de despacho de Reunata
```

---

## Checklist

- [x] Credenciales de Enviopack — `ENVIOPACK_ACCESS_TOKEN` en Vercel
- [x] Columnas de dimensiones en `productos`
- [x] Cotización funcional en carrito
- [x] Re-verificación server-side al checkout
- [ ] Migración: `envio_codigo_postal` + `envio_provincia` en `pedidos`
- [ ] Guardado de CP/provincia en checkout (cambio en `actions/checkout.ts`)
- [ ] Fase 2: formulario dirección completa en carrito
- [ ] Fase 2: migración columnas adicionales en `pedidos`
- [ ] Fase 2: `crearEnvioEnviopack()` llamada desde webhook MP
