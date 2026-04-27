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

**Público objetivo:** revendedores, kioscos, regalerías, distribuidores y tiendas de delicatessen.
**Identidad de marca:** acero inoxidable + granito. Estilo editorial de lujo, minimalismo extremo.

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
| Estado global | Zustand 5 (carrito) |
| Iconos | Lucide React |
| Base de datos | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth con SSR cookies |
| Storage | Supabase Storage — bucket `multimedia` |
| API externa | Gesu (ERP del proveedor, solo lectura) |
| Package manager | pnpm |
| Deploy | Vercel |

---

## Paleta de Colores

Tokens en `src/app/globals.css`:

```
--color-acero-brillo:   #ECEEF1   fondos claros, highlights
--color-acero-claro:    #D4D9E0   bordes, separadores
--color-acero:          #A8B0BB   textos secundarios
--color-acero-oscuro:   #6E7882   labels, placeholders
--color-granito-claro:  #5A5F66   textos terciarios
--color-granito:        #2E3135   textos secundarios oscuros
--color-granito-oscuro: #111316   sidebar, fondo oscuro
--background:           #F0F1F3
--foreground:           #0D0F11
```

**Regla:** siempre `var(--color-*)` inline. Nunca clases Tailwind genéricas (`gray-*`, `zinc-*`).

---

## Sistema de Usuarios y Roles

### Internos — acceden a `/dashboard/admin`
| Rol | Acceso |
|---|---|
| `master` | Todo: productos, clientes, empleados, sync, configuración |
| `empleado` | Pedidos y clientes |
| `comisionista` | Sus pedidos y sus clientes |

### Clientes — acceden a `/dashboard/cliente`
| Rol | Canal | Lista de precios |
|---|---|---|
| `consumidor_final` | Consumidor Final | Lista 5 |
| `distribuidor` | Distribuidor / Pool | Lista 1 |
| `local` | Local comercial | Lista 2 |
| `mercha` | Merchandising | Lista 3 |

### Público — visitantes sin registrar
| Canal | Acceso |
|---|---|
| `publico` | Catálogo público con fotos y nombres, sin precios. El admin controla qué productos son visibles desde la matriz de Canales. |

Los clientes se registran públicamente y quedan **pendientes de aprobación** hasta que un master los habilita.

---

## Variables de Entorno

### `.env.local` (desarrollo)

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # solo server-side, nunca al cliente

GESU_API_BASE_URL=https://gesu.com.ar
GESU_API_TOKEN=

SYNC_SECRET=                    # string aleatorio para proteger el endpoint de sync manual
```

### Variables adicionales en Vercel (producción)

```bash
CRON_SECRET=                    # Vercel lo inyecta automáticamente al crear cron jobs
                                # No hace falta definirlo manualmente
```

> **Nota sobre API keys de Supabase:** Las claves legacy en formato JWT fueron desactivadas por Supabase el 20/04/2026. Las nuevas claves usan formato `sb_publishable_...` / `sb_secret_...`. El alias `NEXT_PUBLIC_SUPABASE_ANON_KEY` apunta a la publishable key para compatibilidad con el código existente.

---

## Despliegue en Vercel — Checklist completo

### 1. Repositorio
- [ ] Pushear rama `main` a GitHub/GitLab
- [ ] Importar el repositorio en [vercel.com/new](https://vercel.com/new)
- [ ] Framework preset: **Next.js** (detección automática)

### 2. Variables de entorno en Vercel Dashboard
Ir a **Settings → Environment Variables** y cargar:

| Variable | Entorno | Valor |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development | Anon key de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | Service role key (solo server) |
| `GESU_API_BASE_URL` | Production, Preview | `https://gesu.com.ar` |
| `GESU_API_TOKEN` | Production, Preview | Token de la API de Gesu |
| `SYNC_SECRET` | Production, Preview | String aleatorio seguro (ej: `openssl rand -hex 32`) |

> `CRON_SECRET` lo genera y gestiona Vercel automáticamente. No hace falta cargarlo.

### 3. Migraciones de base de datos
Antes del primer deploy, aplicar todas las migraciones en orden:

```bash
supabase db push
```

O ejecutarlas manualmente en el SQL editor de Supabase en este orden:
1. `20260418000001_schema_inicial.sql` — Schema base: 10 tablas, triggers
2. `20260418000002_rls.sql` — Row Level Security: políticas por rol
3. `20260418000003_roles_y_canales.sql` — Roles expandidos + canales de venta
4. `20260418000004_storage_multimedia.sql` — Bucket público `multimedia`
5. `20260418000005_whatsapp_config.sql` — Clave `whatsapp_ventas` en config
6. `20260419000001_medio_pago_completo.sql` — CHECK de medio_pago con 9 métodos
7. `20260419000002_producto_canales_inicial.sql` — Asignación inicial productos × canales
8. `20260427000000_public_read_policies.sql` — Políticas RLS de lectura pública para anónimos
9. **(SQL manual)** — Insertar canal `publico` en `canales` y asignar todos los productos activos

### 4. Supabase Storage
Verificar que el bucket `multimedia` exista y tenga las políticas correctas (creado en migración 4). Si no existe, crearlo manualmente:
- Nombre: `multimedia`
- Público: sí
- Tamaño máximo: 10MB
- Tipos permitidos: `image/jpeg, image/png, image/webp, image/avif, application/pdf`

### 5. Crear usuario master inicial
Después del primer deploy, ejecutar localmente:

```bash
node scripts/create-admin.mjs
```

Esto crea `admin@reunata.com` / `***REMOVED***` con rol `master`. **Cambiar la contraseña inmediatamente** desde Supabase Dashboard → Authentication → Users.

### 6. Configurar datos bancarios
Ingresar al dashboard admin → Configuración (`/dashboard/admin/configuracion`) y cargar:
- CBU, alias, banco, razón social, CUIT
- Número de WhatsApp de ventas (para el botón de aviso de pago)
- Monto mínimo de pedido y días de vencimiento

### 7. Primera sincronización con Gesu
Ir a `/dashboard/admin/sync` y ejecutar:
1. **Sincronizar productos** — importa todo el catálogo de Gesu
2. **Sincronizar clientes** — registra los clientes existentes en Gesu

> ⚠️ Gesu tiene límite de 2 requests por hora. Esperar al menos 30 minutos entre syncs.

### 8. Asignar productos a canales
Ir a `/dashboard/admin/canales` y definir qué productos son visibles para cada tipo de cliente (consumidor final, distribuidor, local, mercha).

### 9. Cron jobs automáticos
El archivo `vercel.json` ya configura los cron jobs. Se activan automáticamente al hacer deploy en Vercel Pro. Verificar en **Settings → Cron Jobs**:

| Cron | Frecuencia | Propósito |
|---|---|---|
| `/api/sync/productos` | Cada 2 horas | Mantiene el catálogo actualizado + evita que Supabase hiberne |
| `/api/sync/clientes` | Una vez por día | Actualiza datos de clientes Gesu |

> En plan **Hobby** de Vercel los crons corren mínimo 1 vez por día (no cada 2 horas). Para la frecuencia completa se necesita plan **Pro**.

### 10. Dominio personalizado
En Vercel → Settings → Domains: agregar `reunata.com` y configurar los DNS según indique Vercel.

### 11. Verificar `next.config` para imágenes remotas
✅ Ya configurado en `next.config.ts` con `remotePatterns` para `znmqvjxdnslrrvsjquej.supabase.co`.

---

## Comandos

```bash
pnpm dev                    # desarrollo con Turbopack
pnpm build                  # build de producción
pnpm tsc --noEmit           # verificar tipos sin compilar
pnpm lint                   # ESLint

node scripts/create-admin.mjs   # crear usuario master inicial
supabase db push                # aplicar migraciones SQL
```

---

## Arquitectura Backend

### Base de datos

| Tabla | Descripción |
|---|---|---|
| `profiles` | Extiende `auth.users`. Rol, nombre, aprobado, canal_id, cuit_dni, bonificacion |
| `productos` | Catálogo de Gesu. Precios lista1…lista5, costo, stock |
| `producto_fotos` | Fotos por producto en Supabase Storage. Columna `destacada` para slider home |
| `producto_canales` | Junction: qué productos son visibles en cada canal (incluye canal público) |
| `canales` | 5 canales de venta: 4 para clientes + 1 público para la tienda abierta |
| `categorias_home` | Macrocategorías para el bento de portada (4 iniciales) |
| `pedidos` | 8 estados, medio de pago (9 métodos), total en USD |
| `pedido_items` | Líneas de cada pedido con precio snapshot |
| `comprobantes` | Archivos de pago subidos por el cliente |
| `configuracion` | Clave/valor: CBU, alias, monto mínimo, días vencimiento, WhatsApp |
| `sync_log` | Historial de sincronizaciones con Gesu |

### Integración Gesu
- Sync **unidireccional** (Gesu → Reunata). No se puede escribir de vuelta.
- Límite: **2 requests por hora** por endpoint.
- Cron automático: productos cada 2h, clientes 1 vez/día.

### Auth flow
```
/login → login() → signInWithPassword
  ├── master/empleado/comisionista → /dashboard/admin
  └── clientes → /dashboard/cliente

proxy.ts → updateSession()
  ├── /dashboard/* sin sesión → /login
  └── /login con sesión → /dashboard
```

---

## Roadmap

### ✅ Fase 1 — Home pública
- [x] Setup Next.js 16 + Tailwind v4
- [x] Sistema de diseño: tokens acero/granito, tipografía DM Serif/Sans
- [x] Header con navbar sólido en páginas internas, transparente solo sobre hero
- [x] Hero, CategoryBento, ProductSlider, InstagramSlider, Footer
- [x] Páginas públicas: `/nosotros`, `/tienda`, `/tienda/[slug]`, `/trabaja-con-nosotros`, `/contacto`
- [x] Catálogo público real: `/tienda/[slug]` muestra productos con foto y título (sin precios)
- [x] Canal "Público" en matriz de canales: el admin controla qué productos ve un visitante anónimo
- [x] Scroll suave con Lenis: fixes de trabado en home y dashboard
- [x] Imágenes de Supabase con `unoptimized` para evitar fallos del proxy de next/image

### ✅ Fase 2 — Backend y Auth
- [x] Supabase: 10 tablas, RLS completa, triggers
- [x] 7 roles, 5 canales de venta (incluye público)
- [x] RLS con políticas de lectura pública para `productos` y `producto_fotos`
- [x] Auth con proxy.ts (Next.js 16), redirect por rol
- [x] Server actions: login, logout, canales, clientes, empleados, configuración, pedidos, cuenta

### ✅ Fase 3 — Panel Admin
- [x] Sidebar con nav por rol
- [x] Dashboard con stats en tiempo real
- [x] Productos: tabla con búsqueda y filtro
- [x] Multimedia: upload drag & drop con optimización WebP (resize 1920px, calidad 85%)
- [x] Canales: asignación producto↔canal con bulk select y optimistic UI
- [x] Pedidos: tabla con filtro por 8 estados
- [x] Clientes: aprobación/revocación y asignación de canal
- [x] Empleados: invitación por email
- [x] Sync manual desde Gesu + Cron automático (vercel.json)
- [x] Configuración: datos bancarios, WhatsApp de ventas, parámetros
- [x] Categorías Home: gestión CRUD desde el panel multimedia

### ✅ Fase 3b — Multimedia y Home dinámica
- [x] Gallery rediseñada: productos agrupados por categoría, badges, barra de progreso, filtros
- [x] Fotos destacadas: columna `destacada` en `producto_fotos`, toggle ⭐ desde galería
- [x] ProductSlider: fetcha fotos destacadas con join a productos
- [x] CategoryBento conectado a DB `categorias_home`: 4 macrocategorías, fotos aleatorias, fallback gradiente
- [x] API `/api/categorias-home` (PATCH + POST) con verificación de rol master
- [x] Página `/colecciones`: lista pública de colecciones
- [x] Fix auth en rutas sync: soporte dual SYNC_SECRET + sesión SSR para master

### ✅ Fase 4 — Dashboard Cliente
- [x] Catálogo filtrado por canal con precio de lista correcto
- [x] Carrito con Zustand (persistido en localStorage)
- [x] Historial de pedidos con estados
- [x] Detalle de pedido con instrucciones de pago (tabs por método, CBU copiable)
- [x] Botón WhatsApp prellenado con monto y referencia del pedido
- [x] Upload de comprobante de pago
- [x] Mi cuenta: edición de datos personales y de facturación

### 🔲 Fase 5 — Pagos (ver `docs/payments.md`)

**Mayoristas:**
- [x] Migración SQL: `medio_pago` CHECK expandido a 9 valores (migración `20260419000001`)
- [ ] Migración SQL: nuevos campos en pedidos (`recargo_cueva`, `fecha_cobro_cheq`, `nro_cheque`)
- [ ] Confirmación/rechazo de pago en dashboard admin (botón sobre pedidos con comprobante subido)
- [ ] Vista de comprobante subido por el cliente en el panel admin
- [ ] Cálculo automático recargo Cueva: `(total / 1.21) × 1.05` mostrado en instrucciones
- [ ] Cuenta Corriente: flag `permite_cuenta_corriente` en profiles + tabla `cc_movimientos` (baja prioridad)

**Minoristas (MercadoPago):**
- [ ] Instalar SDK: `@mercadopago/sdk-react` + `mercadopago`
- [ ] Variables de entorno: `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET`
- [ ] Route `/api/checkout/mp` — crea preferencia de pago
- [ ] Route `/api/webhooks/mp` — recibe confirmación y actualiza estado del pedido
- [ ] Solo habilitado para rol `consumidor_final`

**Exportación de pedidos (puente con Gesu):**
- [ ] Instalar: `xlsx` (SheetJS) + `@react-pdf/renderer`
- [ ] Botón exportar PDF desde detalle del pedido (remito informal)
- [ ] Botón exportar Excel/CSV desde lista de pedidos (importable en Gesu)

### 🔲 Fase 6 — CRM (ver `docs/crm.md`)
- [ ] Migración SQL: ~20 campos CRM en `profiles` (tipo_comercio, zona_geografica, es_buen_pagador, forma_entrega, financiacion_dias, categorias_items, canal_atencion, etc.)
- [ ] Campo `codigo_cliente` alfanumérico con auto-generación por tipo (LOC-001, DIS-047…)
- [ ] Ficha individual `/dashboard/admin/clientes/[id]` con tabs:
  - **CRM** — todos los campos editables inline
  - **Pedidos** — historial con totales y estados
  - **Mapa** — pin de ubicación
  - **Notas** — log de contactos internos
- [ ] Filtros avanzados en lista de clientes (zona, tipo comercio, buen pagador, canal)
- [ ] Campos calculados en ficha: ticket promedio, compras últimos 6 meses, periodicidad
- [ ] Botones WhatsApp `wa.me` en ficha de cliente (número prellenado con mensaje)
- [ ] Mapa interactivo con Mapbox + geocodificación automática por localidad/provincia
- [ ] Email marketing con Brevo: sincronizar listas al aprobar cliente, tags por segmento
- [ ] Difusiones programadas por segmento (nuevos ingresos, ofertas, novedades para comisionistas)

### 🔲 Fase 7 — Registro público
- [ ] `/registro` — formulario público para nuevos clientes (nombre, email, teléfono, tipo de comercio, CUIT)
- [ ] Al registrarse: perfil queda `aprobado = false`, rol según tipo declarado
- [ ] Email de bienvenida con Resend ("Tu solicitud fue recibida, te avisamos cuando esté aprobada")
- [ ] Notificación badge en dashboard admin cuando hay clientes pendientes de aprobación

### 🔲 Fase 8 — Comisionista
- [x] Migración SQL: `producto_canales` con 800 asignaciones iniciales (todos los productos × 4 canales)
- [x] Redirect de comisionista a `/dashboard/admin` en `proxy.ts`
- [ ] Dashboard propio para rol `comisionista`: ver sus clientes y sus pedidos
- [ ] Crear pedido en nombre de un cliente desde el dashboard del comisionista
- [ ] Flujo de descuento sugerido: comisionista propone %, master aprueba o rechaza
- [ ] Vista de comisiones devengadas por pedidos entregados

### 🔲 Fase 9 — Optimizaciones y deploy final
- [x] `next.config.ts` con `remotePatterns` para imágenes de Supabase Storage
- [x] Migraciones 1–7 aplicadas
- [ ] Conectar repo a Vercel y configurar las 6 variables de entorno (ver checklist despliegue)
- [ ] Verificar cron jobs activos en Vercel (requiere plan Pro para frecuencia cada 2h)
- [ ] Dominio personalizado `reunata.com` con DNS en Vercel
- [ ] Revisar RLS en Supabase: confirmar que ningún dato sensible es accesible sin auth
- [ ] Test end-to-end del flujo completo: registro → aprobación → catálogo → pedido → pago → confirmación
- [ ] Smoke test con usuario de cada rol (master, empleado, distribuidor, consumidor_final)

---

## Convenciones de Código

- **Server vs Client:** server components por defecto. `'use client'` solo con estado/hooks/animaciones.
- **Server Actions:** en `src/app/actions/`. Siempre `'use server'` al tope del archivo.
- **Optimistic UI:** `useTransition` + `useState` local sin esperar respuesta del servidor.
- **Imágenes:** siempre `next/image` con `fill` + `sizes`. Imágenes de Supabase Storage usan `unoptimized` (ya están en WebP optimizadas desde la subida).
- **Colores:** siempre `var(--color-nombre)` inline. No paleta Tailwind genérica.
- **`pnpm tsc --noEmit` antes de commitear.**
- **Scroll en layouts internos:** layouts con `overflow-auto` propio (como el dashboard) deben usar `data-lenis-prevent` para evitar conflicto con Lenis.
