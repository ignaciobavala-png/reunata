# Reunata — Marketplace Mayorista de Mate

Plataforma B2B para importación y distribución mayorista de productos de mate, termos y accesorios. Desarrollada con Next.js 16, Supabase y Tailwind CSS v4.

---

## Qué es Reunata

Reunata es una tienda **mayorista B2B** que importa y distribuye productos relacionados a la cultura del mate:

- Mates (calabaza, madera, acero, silicona, cuero)
- Termos y vasos térmicos de doble pared
- Bombillas (acero inoxidable, alpaca, filtro)
- Yerbas seleccionadas (importadas y nacionales)
- Accesorios (portatermos, sets de regalo, soportes)

**Público objetivo:** revendedores, kioscos, regalerías, distribuidores y tiendas de delicatessen. El cliente compra en cantidad mínima (por docena/caja). No es una tienda de retail común.

**Identidad de marca:** acero inoxidable + granito. Estilo editorial de lujo, minimalismo extremo, mucho espacio negativo.

---

## Stack Técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Lenguaje | TypeScript strict |
| Estilos | Tailwind CSS v4 |
| Fuentes | DM Serif Display (títulos) · DM Sans (cuerpo) |
| Animaciones | Framer Motion 12 |
| Scroll suave | Lenis 1.3 |
| Carruseles | Embla Carousel React 8 |
| Estado global | Zustand 5 |
| Iconos | Lucide React |
| Utilidades CSS | clsx + tailwind-merge (`cn()` en `src/lib/utils.ts`) |
| Base de datos | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth con SSR cookies |
| Storage | Supabase Storage — bucket `multimedia` |
| API externa | Gesu (ERP del proveedor) |
| Package manager | pnpm |
| Deploy | Vercel (pendiente) |

---

## Paleta de Colores

Tokens en `src/app/globals.css`:

```
Acero Inoxidable:
  --color-acero-brillo:   #ECEEF1   (fondos claros, highlights)
  --color-acero-claro:    #D4D9E0   (bordes, separadores)
  --color-acero:          #A8B0BB   (textos secundarios)
  --color-acero-oscuro:   #6E7882   (labels, placeholders)

Granito:
  --color-granito-claro:  #5A5F66   (textos terciarios)
  --color-granito:        #2E3135   (textos secundarios oscuros)
  --color-granito-oscuro: #111316   (fondo oscuro, sidebar, overlays)

Semánticos:
  --background:   #F0F1F3
  --foreground:   #0D0F11
  --border:       rgba(13,15,17,0.1)
```

**Regla:** siempre `var(--color-*)` en lugar de clases Tailwind genéricas (`gray-*`, `zinc-*`).

---

## Sistema de Usuarios y Roles

7 roles distintos divididos en dos grupos:

### Internos (acceden a `/dashboard/admin`)
| Rol | Descripción |
|---|---|
| `master` | Acceso total: productos, clientes, empleados, sync, configuración |
| `empleado` | Pedidos y clientes |
| `comisionista` | Sus pedidos y sus clientes. Puede sugerir descuentos |

### Clientes (acceden a `/dashboard/cliente`)
| Rol | Canal | Lista de precios |
|---|---|---|
| `consumidor_final` | Consumidor Final | Lista 5 |
| `distribuidor` | Distribuidor / Pool | Lista 1 (por bulto, con pre-compra) |
| `local` | Local comercial | Lista 2 |
| `mercha` | Merchandising | Lista 3 (por bulto y unidad) |

Los clientes se registran públicamente y quedan **pendientes de aprobación** hasta que un master los habilita desde `/dashboard/admin/clientes`.

---

## Arquitectura Backend

### Base de datos (Supabase PostgreSQL)

| Tabla | Descripción |
|---|---|
| `profiles` | Extiende `auth.users`. Campos: rol, nombre, email, aprobado, canal_id, cuit_dni, bonificacion |
| `productos` | Catálogo sincronizado desde Gesu. Campos de precio: precio_lista1…lista5, costo, precio_bulto |
| `producto_fotos` | Fotos por producto. Campos: producto_id, url (path en Storage), orden |
| `producto_canales` | Junction: qué productos son visibles en cada canal |
| `canales` | 4 canales de venta con configuración de precios y políticas |
| `pedidos` | 8 estados: borrador → pendiente_pago → comprobante_subido → pago_confirmado → en_preparacion → enviado → entregado / cancelado |
| `pedido_items` | Líneas de cada pedido |
| `comprobantes` | Archivos de pago subidos por el cliente |
| `configuracion` | Clave/valor: CBU, alias, monto mínimo, días vencimiento |
| `sync_log` | Historial de sincronizaciones con Gesu |

### RLS (Row Level Security)

Funciones helper definidas en PostgreSQL:
- `get_rol()` — devuelve el rol del usuario autenticado
- `es_interno()` — true si master/empleado/comisionista
- `es_cliente()` — true si consumidor_final/distribuidor/local/mercha
- `cliente_aprobado()` — true si es cliente con `aprobado = true`

### Integración Gesu (ERP externo)

Gesu es el sistema de gestión del proveedor. La sincronización es **unidireccional** (Gesu → Reunata). No se puede escribir de vuelta en Gesu salvo que habiliten una API de escritura futura.

- **Productos:** `GET /api_items.php` — paginado, sincroniza en lotes de 100
- **Clientes/proveedores:** `GET /api_clieprov.php`
- **Límite:** 2 requests cada 2 horas por endpoint
- **Sincronización manual:** desde `/dashboard/admin/sync`
- **Sincronización automática:** Vercel Cron (pendiente configurar)

Los endpoints están en `src/app/api/sync/productos/route.ts` y `src/app/api/sync/clientes/route.ts`.

### Auth flow

```
/login → server action login() → signInWithPassword → redirect por rol
  ├── master/empleado/comisionista → /dashboard/admin
  └── clientes → /dashboard/cliente

proxy.ts (Next.js 16, reemplaza middleware.ts) → updateSession()
  ├── ruta /dashboard/* sin sesión → redirect /login
  └── ruta /login con sesión → redirect /dashboard
```

---

## Panel de Administración (`/dashboard/admin`)

### Páginas implementadas

| Ruta | Descripción |
|---|---|
| `/` | Stats: pedidos, clientes, productos activos + estado del último sync |
| `/productos` | Tabla de catálogo con búsqueda, filtro por categoría, precios y stock. Server-side con `searchParams` |
| `/multimedia` | Upload de fotos por producto. **Optimiza a WebP antes de subir** (ver más abajo) |
| `/canales` | Grid para asignar qué productos son visibles en cada canal. Optimistic UI con `useTransition` |
| `/pedidos` | Tabla de pedidos con filtro por estado y colores semánticos |
| `/clientes` | Lista de clientes con aprobación/revocación y asignación de canal inline |
| `/empleados` | Equipo interno con formulario de invitación por email |
| `/sync` | Botones para sincronizar productos y clientes desde Gesu manualmente |
| `/configuracion` | Datos bancarios para transferencias + parámetros de pedidos |

### Optimización de imágenes en Multimedia

Antes de subir al bucket de Supabase, cada imagen pasa por un pipeline en el browser (Canvas API, sin librerías):

1. **Redimensionar** al lado máximo de 1920px, manteniendo proporción
2. **Convertir a WebP** con calidad 85%
3. **Subir** el Blob resultante con `contentType: 'image/webp'`

Resultado típico: una foto de cámara de 5 MB queda en ~300–600 KB. Las rutas en Storage siempre terminan en `.webp` independientemente del formato original.

La lógica está en `src/app/dashboard/admin/multimedia/MultimediaClient.tsx` → función `optimizarImagen()`.

---

## Estructura de Archivos

```
src/
├── app/
│   ├── globals.css                    ← tokens de diseño y reset
│   ├── layout.tsx                     ← fuentes + LenisProvider
│   ├── page.tsx                       ← home pública
│   ├── login/page.tsx                 ← formulario de login
│   ├── actions/
│   │   ├── auth.ts                    ← login(), logout()
│   │   ├── canales.ts                 ← toggleProductoCanal(), asignarCanalMasivo()
│   │   ├── clientes.ts                ← aprobarCliente(), actualizarCanalCliente()
│   │   ├── empleados.ts               ← invitarEmpleado(), desactivarEmpleado()
│   │   └── configuracion.ts           ← guardarConfiguracion()
│   ├── api/
│   │   ├── sync/productos/route.ts    ← POST: sync desde Gesu
│   │   ├── sync/clientes/route.ts     ← POST: sync desde Gesu
│   │   └── multimedia/route.ts        ← DELETE foto, PATCH orden
│   └── dashboard/
│       ├── layout.tsx                 ← auth guard + Sidebar
│       ├── admin/
│       │   ├── page.tsx               ← stats
│       │   ├── productos/page.tsx
│       │   ├── multimedia/
│       │   │   ├── page.tsx
│       │   │   └── MultimediaClient.tsx
│       │   ├── canales/
│       │   │   ├── page.tsx
│       │   │   └── CanalesClient.tsx
│       │   ├── pedidos/page.tsx
│       │   ├── clientes/
│       │   │   ├── page.tsx
│       │   │   └── ClientesClient.tsx
│       │   ├── empleados/
│       │   │   ├── page.tsx
│       │   │   └── EmpleadosClient.tsx
│       │   ├── sync/page.tsx
│       │   └── configuracion/page.tsx
│       └── cliente/
│           └── page.tsx               ← (pendiente: catálogo, carrito, pedidos)
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   ├── dashboard/
│   │   └── Sidebar.tsx                ← nav por rol, logout
│   ├── sections/
│   │   ├── Hero.tsx
│   │   ├── CategoryBento.tsx
│   │   ├── ProductSlider.tsx
│   │   └── InstagramSlider.tsx
│   └── ui/
│       └── FadeIn.tsx
├── lib/
│   ├── utils.ts                       ← cn()
│   └── supabase/
│       ├── client.ts                  ← createBrowserClient
│       ├── server.ts                  ← createServerClient con cookies
│       └── middleware.ts              ← updateSession()
├── proxy.ts                           ← Next.js 16 (reemplaza middleware.ts)
└── providers/
    └── LenisProvider.tsx
supabase/
└── migrations/
    ├── 20260418000001_schema_inicial.sql
    ├── 20260418000002_rls.sql
    ├── 20260418000003_roles_y_canales.sql
    └── 20260418000004_storage_multimedia.sql
scripts/
└── create-admin.mjs                   ← crea usuario master de prueba
public/
├── fotos/
└── logo.png
```

---

## Variables de Entorno

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # solo server-side

# API Gesu
GESU_API_BASE_URL=https://gesu.com.ar
GESU_API_TOKEN=

# Seguridad sync (opcional: valida que el cron sea legítimo)
SYNC_SECRET=
```

---

## Comandos

```bash
pnpm dev                    # desarrollo con Turbopack
pnpm build                  # build de producción
pnpm tsc --noEmit           # verificar tipos sin compilar
pnpm lint                   # ESLint

# Crear usuario master de prueba
node scripts/create-admin.mjs
# → admin@reunata.com / ***REMOVED***

# Aplicar migraciones SQL
supabase db push
```

---

## Roadmap

### ✅ Fase 1 — Home pública
- [x] Setup Next.js 16 + Tailwind v4 + librerías
- [x] Sistema de diseño: tokens acero/granito, tipografía DM Serif/Sans
- [x] Lenis smooth scroll global
- [x] Header sticky con transición transparente → sólido
- [x] Hero full-screen con imagen de fondo y título animado
- [x] Category Bento Grid asimétrico (grid-cols-12)
- [x] Product Snap Slider (Embla)
- [x] Instagram Free Scroll Slider (Embla dragFree)
- [x] Footer con "REUNATA" gigante + 4 columnas + newsletter
- [x] Dropdown de categorías (8 categorías de Gastón)

### ✅ Fase 2 — Backend y Auth
- [x] Supabase: 10 tablas, RLS completa, triggers
- [x] 7 roles: master, empleado, comisionista, consumidor_final, distribuidor, local, mercha
- [x] 4 canales de venta con listas de precios
- [x] Auth con proxy.ts (Next.js 16), redirect por rol
- [x] Server actions: login, logout, canales, clientes, empleados, configuración

### ✅ Fase 3 — Panel Admin
- [x] Sidebar con nav por rol
- [x] Dashboard con stats en tiempo real
- [x] Productos: tabla con búsqueda + filtro por categoría
- [x] Multimedia: upload drag & drop con **optimización WebP** (resize 1920px, calidad 85%)
- [x] Canales: asignación producto↔canal con bulk select y optimistic UI
- [x] Pedidos: tabla con filtro por estado (8 estados con colores semánticos)
- [x] Clientes: aprobación/revocación y asignación de canal inline
- [x] Empleados: invitación por email, desactivación
- [x] Sync manual desde Gesu (productos + clientes)
- [x] Configuración: datos bancarios + parámetros de pedidos

### 🔲 Fase 4 — Dashboard Cliente
- [ ] `/dashboard/cliente/catalogo` — productos filtrados por canal + lista de precios
- [ ] `/dashboard/cliente/pedidos` — historial de pedidos del cliente
- [ ] `/dashboard/cliente/cuenta` — datos de perfil editables
- [ ] Carrito con Zustand: items, cantidades, subtotal, mínimo de pedido
- [ ] Checkout: formulario → instrucciones de pago → upload comprobante

### 🔲 Fase 5 — Pagos
Ver detalle completo en `payments.md`.

**Mayoristas** (6 métodos, manual):
- [ ] Migración SQL: expandir `medio_pago` CHECK (9 valores) + campos nro_cheque, fecha_cobro, recargo_cueva
- [ ] Pantalla instrucciones de pago con tabs por método (CBU copiable, datos cueva por fuera)
- [ ] Cálculo automático recargo Cueva: `(total / 1.21) * 1.05`
- [ ] Upload comprobante por el cliente → estado `comprobante_subido`
- [ ] Confirmación/rechazo manual en dashboard admin
- [ ] Cuenta Corriente: flag por cliente + tabla `cc_movimientos` (baja prioridad)

**Minoristas** (MercadoPago):
- [ ] SDK: `@mercadopago/sdk-react` + `mercadopago`
- [ ] Route `/api/checkout/mp` — crea preferencia
- [ ] Route `/api/webhooks/mp` — confirma pago automáticamente
- [ ] Solo activo para rol `consumidor_final`

**Exportación de pedidos** (puente con Gesu):
- [ ] PDF de pedido con `@react-pdf/renderer`
- [ ] Excel/CSV con `xlsx` (SheetJS)

### 🔲 Fase 6 — Registro público
- [ ] `/registro` — formulario público para nuevos clientes
- [ ] Email de bienvenida (Resend)
- [ ] Notificación al admin de nuevo cliente pendiente

### 🔲 Fase 7 — Deploy
- [ ] Proyecto en Vercel vinculado al repo
- [ ] Variables de entorno en Vercel Dashboard
- [ ] Vercel Cron para sync automático de Gesu (cada 2 horas)
- [ ] Dominio personalizado
- [ ] `next.config` con `remotePatterns` para imágenes de Supabase Storage

---

## Convenciones de Código

- **Server vs Client:** server components por defecto. `'use client'` solo con estado/hooks/animaciones.
- **Server Actions:** en `src/app/actions/`. Siempre `'use server'` al tope del archivo.
- **Optimistic UI:** `useTransition` + `useState` local, sin esperar la respuesta del servidor para actualizar la UI.
- **Imágenes:** siempre `next/image` con `fill` + `sizes`. Nunca `<img>` nativo.
- **Colores:** siempre `var(--color-nombre)` inline. No usar paleta Tailwind genérica.
- **Tipografía en JSX:** títulos con `style={{ fontFamily: 'var(--font-display)' }}`.
- **Supabase client-side:** `createClient()` del módulo `@/lib/supabase/client` (browser). Server-side: `await createClient()` del módulo `@/lib/supabase/server`.
- **`pnpm tsc --noEmit` antes de commitear.**
