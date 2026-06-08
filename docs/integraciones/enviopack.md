# Enviopack — Integración de envíos

Documentación técnica de la integración con [Enviopack](https://www.enviopack.com.ar/) para el módulo de envíos del carrito de Reunata.

Referencia oficial: https://developers.enviopack.com.ar

---

## Qué es Enviopack

Plataforma argentina de gestión de envíos que actúa como intermediario entre la tienda y múltiples correos (Andreani, OCA, Correo Argentino, etc.). Permite cotizar, crear pedidos y generar etiquetas desde una sola API.

---

## Autenticación

**Endpoint:** `POST https://api.enviopack.com/auth`

**Credenciales:** Se obtienen en https://app.enviopack.com/configuraciones-api

```json
{
  "api-key": "TU_API_KEY",
  "secret-key": "TU_SECRET_KEY"
}
```

**Respuesta:**
```json
{ "token": "eyJ..." }
```

El token JWT dura **4 horas**. Todas las requests siguientes llevan `Authorization: Bearer <token>`.

**Variables de entorno necesarias en Vercel:**
```
ENVIOPACK_API_KEY=...
ENVIOPACK_SECRET_KEY=...
ENVIOPACK_CP_ORIGEN=...   # CP del depósito/domicilio de despacho de Reunata
```

---

## Flujo completo de integración

```
1. Cliente agrega productos al carrito
2. Cliente va al carrito → ingresa CP de destino
3. Frontend llama a /api/envios/cotizar → devuelve opciones con precios
4. Cliente elige opción de envío
5. Cliente ingresa dirección completa de entrega
6. Se genera preferencia de MP con (subtotal productos + costo envío)
7. Cliente paga en MP
8. Webhook /api/mp/webhook detecta pago aprobado
9. Se llama a Enviopack POST /pedidos → se guarda enviopack_pedido_id en el pedido
10. Cliente puede hacer seguimiento con el número de envío
```

---

## Endpoints de Enviopack que usaremos

### 1. Cotizar envío

```
POST https://api.enviopack.com/cotizas
```

**Body:**
```json
{
  "cp_destino": "1425",
  "provincia_destino": "Buenos Aires",
  "peso": 1.5,
  "alto": 20,
  "ancho": 30,
  "largo": 40
}
```

**Respuesta:** Array de opciones de correo con precio, plazo y servicio. Se filtrará y mostrará al cliente para que elija.

**Nuestra API route interna:** `GET /api/envios/cotizar?cp=1425&peso=1.5&alto=20&ancho=30&largo=40`

### 2. Crear pedido (post-pago)

```
POST https://api.enviopack.com/pedidos
```

Se llama desde el webhook de MP cuando `status === 'approved'`. Crea el pedido en Enviopack y genera la etiqueta.

**Body mínimo:**
```json
{
  "correo": "andreani",
  "servicio": "estandar",
  "destinatario": {
    "nombre": "Juan Pérez",
    "telefono": "1155556666",
    "email": "juan@email.com"
  },
  "direccion_destino": {
    "calle": "Av. Santa Fe",
    "numero": "1234",
    "localidad": "CABA",
    "provincia": "Buenos Aires",
    "cp": "1425"
  },
  "paquetes": [
    { "peso": 1.5, "alto": 20, "ancho": 30, "largo": 40 }
  ],
  "referencia_externa": "PEDIDO-UUID"
}
```

**Respuesta:** incluye `id` del pedido en Enviopack y `numero_seguimiento`.

---

## Cambios en la base de datos

### Tabla `productos` — nuevas columnas

Peso y dimensiones son necesarios para cotizar. No vienen de Gesu → se gestionan manualmente.

```sql
ALTER TABLE productos
  ADD COLUMN peso_kg     numeric(6,3) DEFAULT NULL,
  ADD COLUMN alto_cm     integer      DEFAULT NULL,
  ADD COLUMN ancho_cm    integer      DEFAULT NULL,
  ADD COLUMN largo_cm    integer      DEFAULT NULL;
```

**Pregunta para Gastón:** ¿todos los productos tienen dimensiones similares? Si sí, podría usarse un valor global configurable en `configuracion` en lugar de por producto.

### Tabla `pedidos` — nuevas columnas

```sql
ALTER TABLE pedidos
  ADD COLUMN envio_nombre      text,
  ADD COLUMN envio_direccion   text,
  ADD COLUMN envio_numero      text,
  ADD COLUMN envio_piso        text,
  ADD COLUMN envio_localidad   text,
  ADD COLUMN envio_provincia   text,
  ADD COLUMN envio_cp          text,
  ADD COLUMN envio_correo      text,   -- ej: "andreani"
  ADD COLUMN envio_servicio    text,   -- ej: "estandar"
  ADD COLUMN envio_costo       numeric(12,2),
  ADD COLUMN enviopack_pedido_id    text,
  ADD COLUMN envio_nro_seguimiento  text;
```

---

## Cambios en el frontend (carrito)

### Paso nuevo antes del pago

El `CartClient` actual tiene un botón directo a MP. Habría que agregar un paso intermedio:

```
[Resumen carrito] → [Datos de envío] → [Elegir correo] → [Pagar con MP]
```

O podría ser todo en la misma página como secciones que se van habilitando secuencialmente.

**Componentes nuevos:**
- `FormularioDireccionEnvio` — nombre, dirección, CP, localidad, provincia, teléfono
- `SelectorEnvio` — lista de opciones cotizadas (correo, servicio, precio, plazo)

### Cambio en `checkout.ts`

```ts
// Hoy
total = suma de productos

// Con envío
total = suma de productos + envio_costo
```

El objeto de inserción en `pedidos` incluirá todos los campos de envío.

---

## Cambios en el webhook MP

En `src/app/api/mp/webhook/route.ts`, al detectar `status === 'approved'`:

```ts
// 1. Marcar pedido como pagado (ya existe)
// 2. NUEVO: Llamar a Enviopack para crear el pedido
const envioRes = await crearPedidoEnviopack(pedidoId)
await supabase.from('pedidos').update({
  enviopack_pedido_id: envioRes.id,
  envio_nro_seguimiento: envioRes.numero_seguimiento,
}).eq('id', pedidoId)
```

---

## SDK disponible

Existe `enviopack-node` en npm. Conviene revisarlo antes de implementar para no escribir el wrapper de autenticación + refresh manualmente.

```bash
npm install enviopack-node
```

---

## Preguntas clave para charla con Gastón

Antes de implementar, resolver estos puntos:

1. **¿Envío a todo el país o solo ciertas provincias?** Enviopack soporta múltiples correos pero no todos llegan a todos lados.

2. **¿Dimensiones por producto o valor global?** Si los productos son similares en tamaño, un default configurable es más simple que gestionar por producto.

3. **¿Quién despacha?** Necesitamos el CP y dirección de origen (depósito o domicilio de Reunata) fijos en la config.

4. **¿Envío gratis a partir de cierto monto?** Habitual en e-commerce — si sí, ¿cuál es el umbral?

5. **¿Envío solo para consumidor_final o también mayoristas?** Actualmente el checkout con MP es solo para `consumidor_final`. Los mayoristas coordinan por WhatsApp.

6. **¿Mostrar opciones de correo o elegir uno fijo?** Podría mostrarse solo Andreani, o todas las opciones cotizadas. Definir con Gastón.

7. **¿Retiro en punto de venta?** Enviopack soporta pickup points. ¿Reunata tiene local físico?

8. **¿Facturación?** Algunos correos requieren datos fiscales (CUIT) para empresas. ¿El flujo lo necesita?

---

## Archivos que se crearán/modificarán

| Archivo | Tipo de cambio |
|---|---|
| `src/app/api/envios/cotizar/route.ts` | Nuevo — cotización desde el frontend |
| `src/lib/enviopack.ts` | Nuevo — wrapper de autenticación y llamadas |
| `src/app/actions/checkout.ts` | Modificar — incluir datos y costo de envío |
| `src/app/api/mp/webhook/route.ts` | Modificar — crear pedido en Enviopack post-pago |
| `src/app/(public)/carrito/CartClient.tsx` | Modificar — paso de dirección + selector de envío |
| `src/stores/cartStore.ts` | Modificar — guardar opción de envío elegida |
| `supabase/migrations/` | Nueva migración — columnas en `pedidos` y `productos` |

---

## Estado

- [ ] Charla con Gastón (puntos de arriba)
- [ ] Credenciales de Enviopack (cuenta y API keys)
- [ ] Decisión: dimensiones globales vs por producto
- [ ] Migración DB
- [ ] Implementación
