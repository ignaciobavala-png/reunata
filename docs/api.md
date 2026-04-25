# API — Reunata Web

Cuatro endpoints internos, ninguno público. Todos requieren autenticación.

---

## `/api/sync/productos` — Sincronizar catálogo desde Gesu

**Métodos:** `GET`, `POST`

**Auth:** `Authorization: Bearer <SYNC_SECRET>` (cron/server) O sesión SSR de usuario con rol `master` (dashboard)

**Propósito:** Obtiene todas las páginas de `api_items.php` de Gesu, deduplica por `codigoInterno`, transforma al esquema de la tabla `productos` y hace upsert en batches de 100.

**Límite:** Gesu permite 2 requests/hora. El endpoint itera páginas automáticamente (1 request por página), por lo que una sync completa puede consumir el límite.

**Cron:** Cada 2 horas (`vercel.json`)

**Response éxito:**
```json
{ "ok": true, "registros": 847, "ms": 3240 }
```

**Response error:**
```json
{ "error": "Gesu devolvió 500 en página 3" }
```
Status: 500

**Ejemplo curl:**
```bash
curl -X POST https://reunata.vercel.app/api/sync/productos \
  -H "Authorization: Bearer <SYNC_SECRET>"
```

---

## `/api/sync/clientes` — Sincronizar clientes desde Gesu

**Métodos:** `GET`, `POST`

**Auth:** Idéntico a productos: `Bearer <SYNC_SECRET>` O sesión SSR master

**Propósito:** Obtiene páginas de `api_clieprov.php`, filtra solo `relacion === 'Cliente'`. **No crea usuarios auth** — solo registra el conteo en `sync_log`. Los clientes se registran solos en la web.

**Cron:** Una vez por día a la 1 AM (`vercel.json`)

**Response éxito:**
```json
{ "ok": true, "registros": 320, "ms": 1500 }
```

---

## `/api/multimedia` — Gestión de fotos de productos

**Métodos:** `PATCH`, `DELETE`

**Auth:** Cualquier usuario autenticado (sesión SSR via cookies)

### PATCH

Actualiza `orden` y/o `destacada` en una fila de `producto_fotos`.

**Request body:**
```json
{ "id": 42, "destacada": true }
```

**Response:**
```json
{ "ok": true }
```

### DELETE

Elimina archivo del bucket Storage + fila de `producto_fotos`.

**Request body:**
```json
{ "path": "productos/foto.jpg", "fotoId": 42 }
```

**Response:**
```json
{ "ok": true }
```

---

## `/api/categorias-home` — Gestión de categorías de portada

**Métodos:** `PATCH`, `POST`

**Auth:** Solo usuario con rol `master`

### PATCH

Actualiza campos de una categoría existente.

**Request body:**
```json
{ "id": 1, "nombre": "Mates", "activo": false }
```

**Response:**
```json
{ "ok": true }
```

### POST

Crea una nueva categoría.

**Request body:**
```json
{
  "nombre": "Nueva Colección",
  "descripcion": "Llegaron los nuevos modelos",
  "href": "/tienda/nueva-coleccion",
  "categoria_keys": ["mates", "termos"]
}
```

**Response:**
```json
{ "data": { "id": 5, "nombre": "Nueva Colección", ... } }
```
