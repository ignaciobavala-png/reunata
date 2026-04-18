# Reunata — CRM y Comunicaciones

> Documento de planificación para el módulo CRM, zonas geográficas,
> integración con WhatsApp y comunicaciones masivas.
> Última actualización: 2026-04-18

---

## 1. Ficha CRM por cliente

Cada cliente mayorista tendrá una ficha interna que solo ve el equipo de Reunata.
Los datos se completan manualmente por el master o empleados, y algunos
se calculan automáticamente desde los pedidos.

### Campos a agregar en `profiles`

| Campo | Tipo | Valores posibles | Fuente |
|-------|------|-----------------|--------|
| `codigo_cliente` | text | Alfanumérico libre (ej: "DIS-001") | Manual |
| `tipo_comercio` | text | local, pool_compra, distribuidor, fabricante, ml, otro | Manual |
| `tipo_comercio_otro` | text | Descripción libre si eligió "otro" | Manual |
| `facturado_nivel` | text | 25%, 50%, 100%, otro | Manual |
| `es_buen_pagador` | boolean | true / false | Manual |
| `forma_entrega` | text | retira, envios_amba, expresos, otro | Manual |
| `forma_entrega_otro` | text | Descripción libre | Manual |
| `forma_pago_acordada` | text | efectivo, transferencia, cheque, cc, otra | Manual |
| `financiacion_dias` | integer | 0, 30, 60, otro | Manual |
| `financiacion_dias_otro` | integer | Días libres si eligió "otro" | Manual |
| `items_rango` | text | 0_5, 6_15, mas_15 | Manual |
| `categorias_items` | integer[] | Array con números 1–8 (las 8 categorías de Gastón) | Manual |
| `apuesta_marca` | boolean | true / false | Manual |
| `canal_atencion` | text | web, comisionista, whatsapp | Manual |
| `descuento_pct` | numeric | Porcentaje, ej: 10.5 | Manual |
| `contacto_preferido` | text | whatsapp, llamada, mail, visita, otra | Manual |
| `ultimo_contacto_fecha` | date | Fecha libre | Manual |
| `ultimo_contacto_forma` | text | whatsapp, llamada, mail, visita, otra | Manual |
| `interesa_precompra` | boolean | true / false | Manual |
| `zona_geografica` | text | Zona libre (ej: "Sur CABA", "GBA Norte") | Manual |
| `provincia` | text | Nombre de provincia | Manual |
| `localidad` | text | Nombre de localidad | Manual |
| `lat` | numeric | Latitud (para mapa) | Geocodificado automático |
| `lng` | numeric | Longitud (para mapa) | Geocodificado automático |
| `notas_crm` | text | Notas internas libres | Manual |

### Campos calculados automáticamente (desde pedidos)

Estos NO se guardan en `profiles`, se calculan en queries al mostrar la ficha:

| Dato | Cómo se calcula |
|------|----------------|
| Ticket promedio | `avg(total_usd)` de pedidos `entregado` de ese cliente |
| Compras últimos 6 meses | `sum(total_usd)` de pedidos `entregado` en los últimos 180 días |
| Cantidad de pedidos | `count(*)` de pedidos distintos de `borrador` y `cancelado` |
| Periodicidad de compra | Diferencia promedio en días entre pedidos `entregado` |
| Último pedido | `max(created_at)` de pedidos |

---

## 2. Código alfanumérico de cliente

Gastón quiere poder identificar a cada cliente con un código interno.

**Formato sugerido:** `[TIPO]-[NÚMERO]`

| Prefijo | Tipo |
|---------|------|
| `LOC` | Local |
| `DIS` | Distribuidor |
| `POO` | Pool de compra |
| `FAB` | Fabricante |
| `ML` | Mercado Libre |
| `OTR` | Otro |

Ejemplos: `LOC-001`, `DIS-047`, `POO-003`

El código se genera manualmente o se puede auto-incrementar por tipo.
Se muestra en la ficha del cliente y se usa como referencia en pedidos y exportaciones.

---

## 3. Pantalla CRM en el dashboard admin

### Vista de lista (`/dashboard/admin/clientes`)

Agregar columnas CRM a la tabla existente:
- Código cliente
- Tipo de comercio
- Zona
- Ticket promedio
- Último pedido
- Buen pagador (badge verde/rojo)

Filtros rápidos:
- Por tipo de comercio
- Por zona geográfica
- Por buen pagador
- Por canal de atención

### Vista de ficha individual (`/dashboard/admin/clientes/[id]`)

Tabs:
1. **Datos CRM** — todos los campos del punto 1, editables inline
2. **Pedidos** — historial de pedidos con totales y estados
3. **Mapa** — pin en el mapa con la ubicación del cliente
4. **Notas** — log de contactos y observaciones internas

---

## 4. Zonas geográficas y mapa

### Caso de uso 1: Coordinación de entregas

El empleado filtra clientes por zona y fecha, y los contacta en bloque:
> "El lunes contactamos a todos los clientes de Sur CABA para avisarles
> que entregamos el miércoles en esa zona."

**En el sistema:**
- Filtro en lista de clientes por `zona_geografica` o `provincia`
- Acción masiva: "Enviar mensaje a este grupo" (genera links de WhatsApp o lista de emails)

### Caso de uso 2: Mapa para vendedor en el interior

El comisionista viaja a un pueblo y ve en un mapa todos los clientes/interesados de esa zona para concertar visitas.

**En el sistema:**
- Mapa interactivo con pins por cliente
- Cada pin muestra: nombre, tipo de comercio, último contacto, teléfono
- Click en pin → abre WhatsApp o llama directo
- Filtro por provincia/localidad/zona

### Implementación técnica

**Geocodificación:** al guardar `localidad` + `provincia`, el sistema llama a la API de Google Maps Geocoding para obtener `lat` y `lng` automáticamente. Solo cuando se guarda/actualiza la dirección.

**Mapa:** Google Maps JavaScript API o Mapbox GL JS. Mapbox es más económico para carga alta de pins.

**Variables de entorno necesarias:**
```
NEXT_PUBLIC_MAPS_API_KEY=   # Google Maps o Mapbox public token
MAPS_SECRET_KEY=            # para geocodificación server-side
```

**Costo estimado:** Google Maps Geocoding API tiene 200 USD de crédito mensual gratis (~40.000 geocodificaciones). Mapbox tiene 50.000 requests gratis/mes. Para la escala de Reunata, costo = $0.

---

## 5. Integración WhatsApp

### Lo que se puede hacer SIN API de negocio (gratis, inmediato)

| Feature | Cómo |
|---------|------|
| Botón "Enviar pedido por WhatsApp" | Link `wa.me/549XXXXXXXX?text=Hola!+Mi+pedido+%230045...` |
| Compartir link de producto | Link `wa.me/...` con texto y URL del producto |
| Avisar al cliente que su pedido fue aprobado | El empleado hace click en "Enviar por WhatsApp" en el dashboard |
| Contactar cliente desde su ficha | Botón que abre WhatsApp con el número del cliente |

Estos links funcionan en mobile y desktop. No requieren ninguna API.

### Lo que requiere WhatsApp Business API (Meta)

| Feature | Costo | Burocracia |
|---------|-------|-----------|
| Mensajes masivos programados | ~USD 0.05 por conversación iniciada | Cuenta verificada Meta, plantillas aprobadas |
| Respuestas automáticas / chatbot | Idem | Idem |
| Envío desde el sistema sin abrir WhatsApp | Idem | Idem |

**Proveedores que facilitan el acceso a la API:**
- **Twilio** (más sencillo, USD 0.0025/msg + por conversación)
- **360dialog** (más económico a escala)
- **Meta directamente** (más complejo de configurar)

**Decisión tomada:** links `wa.me` (costo cero, disponible hoy). El empleado hace click por cada cliente — suficiente para el volumen actual. WhatsApp Business API queda descartada por ahora.

---

## 6. Email marketing

### Transaccional (Resend — ya en el stack)

Para emails 1 a 1 disparados por eventos:
- Pedido confirmado
- Pago verificado
- Pedido enviado
- Bienvenida al registrarse

Ya integrable con Resend (nativo de Vercel). Gratis hasta 3.000 emails/mes.

### Campañas y difusiones

Para envíos masivos segmentados (nuevos ingresos, descuentos, novedades):

**Opción A — Brevo (ex-Sendinblue)**
- Plan gratuito: 300 emails/día, listas ilimitadas
- API simple para segmentar por tipo de cliente, zona, categorías
- Tiene drag & drop para diseñar newsletters

**Opción B — Mailchimp**
- Plan gratuito: 500 contactos, 1.000 envíos/mes
- Más conocido, más costoso a escala

**Recomendación:** Brevo. Mejor relación gratis/funcionalidad y API más flexible.

**Integración:**
- Al aprobar un cliente, se lo agrega automáticamente a la lista de Brevo con sus tags (tipo de comercio, zona, canal)
- Las difusiones se diseñan en Brevo directamente
- Los comisionistas tienen su propia lista para recibir novedades de productos que pueden ofrecer

---

## 7. Difusiones programadas

### Por email (con Brevo + Vercel Cron)

| Difusión | Audiencia | Frecuencia sugerida |
|----------|-----------|-------------------|
| Nuevos ingresos al catálogo | Todos los clientes aprobados | Quincenal |
| Productos en oferta / precompra | Clientes con `interesa_precompra = true` | Según campaña |
| Novedades para comisionistas | Lista de comisionistas | Semanal |
| Recordatorio de pago pendiente | Clientes con pedido en `pendiente_pago` | A los 2 y 4 días |
| Clientes sin pedido en 60+ días | Clientes inactivos | Mensual |

### Por WhatsApp (manual con links, o Business API a futuro)

Con `wa.me` links, el empleado puede:
1. Filtrar clientes por zona/tipo
2. Exportar lista de números
3. Enviar mensaje uno a uno desde el sistema (abre WhatsApp con texto prellenado)

Con Business API (futuro):
- El sistema envía el mensaje directamente sin intervención manual
- Requiere plantillas pre-aprobadas por Meta

---

## 8. Migración SQL necesaria

```sql
-- Agregar campos CRM a profiles
alter table public.profiles
  add column if not exists codigo_cliente          text unique,
  add column if not exists tipo_comercio           text check (tipo_comercio in (
    'local','pool_compra','distribuidor','fabricante','ml','otro'
  )),
  add column if not exists tipo_comercio_otro      text,
  add column if not exists facturado_nivel         text check (facturado_nivel in ('25','50','100','otro')),
  add column if not exists es_buen_pagador         boolean,
  add column if not exists forma_entrega           text check (forma_entrega in (
    'retira','envios_amba','expresos','otro'
  )),
  add column if not exists forma_entrega_otro      text,
  add column if not exists forma_pago_acordada     text check (forma_pago_acordada in (
    'efectivo','transferencia','cheque','cc','otra'
  )),
  add column if not exists financiacion_dias       integer,
  add column if not exists items_rango             text check (items_rango in ('0_5','6_15','mas_15')),
  add column if not exists categorias_items        integer[],
  add column if not exists apuesta_marca           boolean,
  add column if not exists canal_atencion          text check (canal_atencion in (
    'web','comisionista','whatsapp'
  )),
  add column if not exists descuento_pct           numeric default 0,
  add column if not exists contacto_preferido      text check (contacto_preferido in (
    'whatsapp','llamada','mail','visita','otra'
  )),
  add column if not exists ultimo_contacto_fecha   date,
  add column if not exists ultimo_contacto_forma   text,
  add column if not exists interesa_precompra      boolean default false,
  add column if not exists zona_geografica         text,
  add column if not exists provincia               text,
  add column if not exists localidad               text,
  add column if not exists lat                     numeric,
  add column if not exists lng                     numeric,
  add column if not exists notas_crm               text;
```

---

## 9. Orden de implementación sugerido

### Prioridad alta (MVP del CRM)
1. Migración SQL con campos CRM
2. Ficha individual de cliente (`/dashboard/admin/clientes/[id]`) con tab "Datos CRM"
3. Código alfanumérico de cliente con auto-generación
4. Filtros en lista de clientes por zona, tipo, buen pagador

### Prioridad media
5. Campos calculados en la ficha (ticket promedio, compras 6 meses, etc.)
6. Botones de WhatsApp en ficha del cliente (links `wa.me`)
7. Mapa de clientes con Mapbox + geocodificación automática

### Prioridad baja / Fase 2
8. Email marketing con Brevo (listas automáticas al aprobar cliente)
9. Difusiones programadas por segmento
10. WhatsApp Business API para envíos masivos automáticos

---

## 10. Lo que NO entra en el sistema (por ahora)

- CRM externo (Hubspot, Salesforce) — innecesario a esta escala
- Chatbot de WhatsApp — requiere Business API + desarrollo de flujos
- Facturación electrónica — queda en Gesu
- Scoring automático de clientes con IA — futuro lejano
