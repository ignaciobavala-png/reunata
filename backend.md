# Reunata — Arquitectura de Backend

> Plan de arquitectura para el backend del marketplace mayorista de Reunata.
> Stack: Next.js (App Router) + Supabase (Auth + Postgres + RLS)

---

## 1. Roles de Usuario

### Master
El dueño del negocio. Acceso total sin restricciones.

- Ver y editar productos, precios, stock
- Ver todos los pedidos (propios y de clientes)
- Gestionar empleados (crear, desactivar, cambiar permisos)
- Ver datos sensibles: márgenes, precio de compra, listas de precios internas
- Configurar la sincronización con la API externa
- Ver reportes y analytics

### Empleado
Personal interno de Reunata. Acceso operativo, sin acceso a datos sensibles.

- Ver catálogo de productos (sin precio de compra, sin lista 1/2/3/4)
- Gestionar pedidos asignados
- Ver y contactar clientes asignados a ellos
- **NO puede** ver precios de compra ni márgenes
- **NO puede** crear o eliminar empleados
- **NO puede** cambiar listas de precios

### Cliente (mayorista)
Los compradores del negocio. Acceso solo a su propio contexto.

- Ver catálogo con **su lista de precios asignada** (listaPrecios del API: Locales WEB, Minorista, etc.)
- Crear y ver sus propios pedidos
- Ver su historial de compras
- Ver y editar su perfil
- **NO puede** ver precios de otros clientes
- **NO puede** ver datos de empleados o del negocio

---

## 2. Modelo de Datos en Supabase

### Tabla: `profiles`
Extiende `auth.users` de Supabase. Un registro por usuario.

```sql
profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id),
  rol          text NOT NULL CHECK (rol IN ('master', 'empleado', 'cliente')),
  nombre       text,
  email        text,
  telefono     text,
  activo       boolean DEFAULT true,
  -- Solo para clientes (sincronizado con api_clieprov):
  lista_precios text,          -- "Locales WEB", "Minorista", etc.
  bonificacion  numeric DEFAULT 0,
  cuit_dni     text,
  condicion_fiscal text,       -- "RESPONSABLE INSCRIPTO", "CONSUMIDOR FINAL", etc.
  -- Solo para empleados:
  empleado_permisos jsonb,     -- permisos extra granulares si se necesitan
  created_at   timestamptz DEFAULT now()
)
```

### Tabla: `productos`
Cache local de la API externa `api_items.php`. Se sincroniza periódicamente.

```sql
productos (
  id                  serial PRIMARY KEY,
  codigo_interno      text UNIQUE,
  codigo_barras       text,
  tipo                text,           -- "INSUMO", "SERVICIO", etc.
  titulo              text NOT NULL,
  categoria           text,
  sub_categoria       text,
  marca               text,
  proveedor           text,
  stock               integer,
  stock_minimo        integer,
  -- Precios (en dólares según la API)
  moneda              text DEFAULT 'u$s',
  precio_compra       numeric,        -- SOLO visible para master
  precio_lista1       numeric,        -- Lista mayorista A
  precio_lista2       numeric,        -- Lista mayorista B
  precio_lista3       numeric,        -- Lista mayorista C
  precio_lista4       numeric,
  precio_lista5       numeric,
  iva                 numeric,        -- 21, 10.5, 0
  descripcion         text,
  palabras_clave      text,
  activo              boolean DEFAULT true,
  ultima_sync         timestamptz,
  created_at          timestamptz DEFAULT now()
)
```

### Tabla: `producto_fotos`
Fotos del catálogo, vinculadas a un producto específico de la tabla `productos`.
La sync con Gesu actualiza datos pero nunca toca esta tabla.

```sql
producto_fotos (
  id          serial PRIMARY KEY,
  producto_id integer REFERENCES productos(id) ON DELETE CASCADE,
  url         text NOT NULL,        -- URL en Supabase Storage
  orden       integer DEFAULT 0,    -- para ordenar múltiples fotos por producto
  created_at  timestamptz DEFAULT now()
)
```

> **Flujo de carga**: el master busca el producto por nombre o código → selecciona → sube la foto.
> La foto se almacena en Supabase Storage bajo `/productos/{codigo_interno}/`.
> Si el producto se elimina de la tabla local, las fotos se eliminan en cascada.

### Tabla: `pedidos`
```sql
pedidos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id    uuid REFERENCES profiles(id),
  empleado_id   uuid REFERENCES profiles(id),  -- empleado que tomó el pedido (opcional)
  estado        text DEFAULT 'pendiente'
                CHECK (estado IN ('pendiente', 'confirmado', 'en_proceso', 'enviado', 'entregado', 'cancelado')),
  total_usd     numeric,
  notas         text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
)
```

### Tabla: `pedido_items`
```sql
pedido_items (
  id           serial PRIMARY KEY,
  pedido_id    uuid REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id  integer REFERENCES productos(id),
  cantidad     integer NOT NULL,
  precio_unit  numeric NOT NULL,  -- precio al momento del pedido (snapshot)
  lista_usada  text               -- "lista1", "lista2", etc. para auditoría
)
```

### Tabla: `sync_log`
Registro de sincronizaciones con la API externa.

```sql
sync_log (
  id          serial PRIMARY KEY,
  tipo        text,       -- "productos" o "clientes"
  estado      text,       -- "ok" o "error"
  registros   integer,
  mensaje     text,
  created_at  timestamptz DEFAULT now()
)
```

---

## 3. Row Level Security (RLS) — Reglas por Tabla

### `profiles`
- **Master**: SELECT/UPDATE todos los profiles
- **Empleado**: SELECT solo su propio profile + SELECT de profiles de clientes asignados
- **Cliente**: SELECT/UPDATE solo su propio profile

### `productos`
- **Master**: SELECT todos los campos (incluyendo `precio_compra`)
- **Empleado**: SELECT todos los campos EXCEPTO `precio_compra`
- **Cliente**: SELECT solo productos activos, solo ve el precio correspondiente a su `lista_precios`

### `pedidos`
- **Master**: SELECT/UPDATE/DELETE todos los pedidos
- **Empleado**: SELECT/UPDATE pedidos donde `empleado_id = auth.uid()` o sin asignar
- **Cliente**: SELECT/INSERT/UPDATE solo sus propios pedidos (`cliente_id = auth.uid()`)

### `pedido_items`
- Hereda acceso del pedido al que pertenecen (via JOIN policy)

---

## 4. Sincronización con la API Externa

### Endpoints disponibles
| Endpoint | Descripción | Registros |
|----------|-------------|-----------|
| `api_items.php?pag={n}` | Catálogo de productos | ~225 items, paginado de 540 |
| `api_clieprov.php?pag={n}` | Clientes y proveedores | ~1674 registros, paginado de 1000 |

### Campos clave de la API de items
- `codigoInterno` → clave única para upsert
- `precioFinalLista1..5` → 5 listas de precios en u$s
- `precioFinalCompra` → costo (solo para master)
- `stock` → inventario actual
- `categoria` / `subCategoria` → para filtros del catálogo

### Campos clave de la API de clientes
- `relacion` → "Cliente" o "Proveedor" (solo sincronizar Clientes)
- `listaPrecios` → determina qué lista ve el cliente en el marketplace
- `condicionFiscal` → para facturación
- `bonificacionGeneral` → descuento extra sobre el precio de lista

### Estrategia de sincronización

**Opción A — Cron Job (recomendada para empezar)**
- Next.js Route Handler en `/api/sync/productos` y `/api/sync/clientes`
- Protegido con secret header (`Authorization: Bearer SYNC_SECRET`)
- Vercel Cron lo llama cada hora (configurable en `vercel.json`)
- Hace upsert en la tabla `productos` usando `codigo_interno` como clave
- Registra resultado en `sync_log`

```
Vercel Cron (cada 1h)
  → POST /api/sync/productos (server-side, protegido)
    → GET api_items.php (paginando hasta traer todos)
    → upsert en tabla productos de Supabase
    → registra en sync_log
```

**Opción B — On-demand (futuro)**
- El master puede triggear una sync manual desde el panel de admin
- Útil después de actualizar precios en el sistema de gestión

### Mapeo de listas de precios
La API de clientes tiene `listaPrecios` como string libre. Necesitamos mapear:

| listaPrecios (API) | Campo en productos |
|--------------------|--------------------|
| "Locales WEB"      | precio_lista5      |
| "Minorista"        | precio_lista2      |
| *(a confirmar con el cliente)* | ... |

> **Acción pendiente**: Confirmar con el dueño qué lista corresponde a cada tipo de cliente mayorista.

---

## 5. Flujo de Autenticación

### Registro de clientes
- El cliente llena un formulario de registro público (razón social, CUIT, email, contraseña, etc.)
- Se crea el usuario en `auth.users` de Supabase con estado `pendiente`
- El **master** aprueba el alta y asigna la lista de precios correspondiente
- Hasta que el master apruebe, el cliente no puede acceder al catálogo

### Creación de empleados y master
- Solo el master puede crear empleados: ingresa email + nombre desde el panel admin
- Supabase envía invitación por email (`supabase.auth.admin.inviteUserByEmail`)
- El empleado setea su contraseña al aceptar la invitación
- El master es creado directamente en Supabase (único, no se registra vía web)

### Login
- Email + contraseña via Supabase Auth
- Supabase devuelve el JWT con el `user.id`
- El middleware de Next.js lee el rol desde `profiles` y redirige al dashboard correspondiente

---

## 6. Estructura de Rutas Next.js (propuesta)

```
/                          → Landing pública (catálogo preview)
/login                     → Login para todos los roles
/registro                  → Formulario de alta de clientes
/catalogo                  → Catálogo completo (requiere auth)
/catalogo/[slug]           → Detalle de producto

/cliente/                  → Dashboard cliente
/cliente/pedidos           → Mis pedidos
/cliente/pedidos/nuevo     → Crear pedido

/admin/                    → Dashboard master + empleados
/admin/productos           → Gestión de productos (master)
/admin/clientes            → Gestión de clientes (master)
/admin/empleados           → Gestión de empleados (master)
/admin/pedidos             → Todos los pedidos (master) / asignados (empleado)
/admin/sync                → Estado y trigger de sincronización (master)
```

---

## 7. Variables de Entorno necesarias

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # solo server-side, para sync y admin

# API externa Gesu
GESU_API_TOKEN=                 # el token del sistema de gestión
GESU_API_BASE_URL=https://gesu.com.ar

# Seguridad sync
SYNC_SECRET=                    # secret para proteger los endpoints de sync

# Tipo de cambio (opcional, para mostrar precios en ARS)
DOLAR_API_URL=                  # API para obtener cotización del dólar
```

---

## 8. Decisiones pendientes de confirmar con el cliente

- [ ] ¿Qué lista de precios (1-5) corresponde a cada tipo de cliente?
- [x] ~~¿Los clientes se registran solos o los da de alta el master?~~ → Formulario público, pero requiere aprobación del master antes de acceder
- [ ] ¿Los precios se muestran en USD, ARS, o ambos?
- [ ] ¿Con qué frecuencia se actualizan los precios en el sistema de gestión?
- [ ] ¿La API de Gesu tiene webhook o hay que hacer polling?
- [ ] ¿Los pedidos generados en Reunata se deben reflejar en el sistema Gesu?
- [ ] ¿Qué empleados ya existen y qué permisos específicos necesitan?

---

## 9. Orden de implementación sugerido

1. **Setup Supabase**: proyecto, tablas, RLS básico
2. **Auth**: login/registro con Next.js + Supabase Auth, middleware de roles
3. **Sync de productos**: cron job + endpoint protegido + tabla `productos`
4. **Catálogo**: página de productos con precios según rol/lista
5. **Pedidos**: flujo completo cliente → confirmación master/empleado
6. **Panel admin**: CRUD de empleados, vista de pedidos, trigger sync manual
7. **Sync de clientes**: opcional, para pre-cargar clientes existentes del sistema Gesu
