# Arquitectura — Reunata Web

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.2.4 (App Router, Turbopack) |
| Lenguaje | TypeScript strict |
| Estilos | Tailwind CSS v4 (CSS-first config via `@import "tailwindcss"` en `globals.css`) |
| Fuentes | DM Serif Display, DM Sans, DM Mono |
| Animaciones | Framer Motion 12 + Lenis 1.3 (smooth scroll) |
| Carruseles | Embla Carousel React 8 |
| Estado global | Zustand 5 (solo carrito, persistido en localStorage) |
| Base de datos | Supabase PostgreSQL + RLS |
| Auth | Supabase Auth con SSR cookies |
| Storage | Supabase Storage (bucket `multimedia`) |
| API externa | Gesu ERP (lectura) |
| Package manager | pnpm |
| Deploy | Vercel |

---

## Estructura del App Router

```
src/app/
├── layout.tsx              Root layout: fuentes, LenisProvider, metadata
├── page.tsx                Home: Hero + CategoryBento + ProductSlider + InstagramSlider
├── globals.css             Design tokens acero/granito
│
├── (public)/               Grupo público (Header + Footer wrapper)
│   ├── layout.tsx          Header + Footer
│   ├── carrito/page.tsx    Redirige a dashboard o login
│   ├── colecciones/page.tsx
│   ├── contacto/page.tsx
│   ├── nosotros/page.tsx
│   ├── tienda/page.tsx
│   ├── tienda/[slug]/page.tsx
│   └── trabaja-con-nosotros/page.tsx
│
├── login/page.tsx          Formulario de login con server action
│
├── dashboard/
│   ├── layout.tsx          Auth guard + Sidebar
│   ├── page.tsx            Redirige por rol
│   │
│   ├── admin/              Acceso: master, empleado, comisionista
│   │   ├── page.tsx        Stats dashboard
│   │   ├── canales/        Asignación producto ↔ canal
│   │   ├── clientes/       Aprobación + canal de clientes
│   │   ├── configuracion/  Datos bancarios, parámetros
│   │   ├── empleados/      Invitar/desactivar internos
│   │   ├── multimedia/     Upload fotos + categorías home
│   │   ├── pedidos/        Lista + filtro por estado
│   │   ├── productos/      Tabla con búsqueda
│   │   └── sync/           Disparar sync manual
│   │
│   └── cliente/            Acceso: consumidor_final, distribuidor, local, mercha
│       ├── page.tsx        Pendiente aprobación o historial
│       ├── catalogo/       Productos filtrados por canal
│       ├── cuenta/         Editar perfil
│       └── pedidos/        Lista + detalle + pago
│
├── actions/                Server actions (use server)
│   ├── auth.ts
│   ├── canales.ts
│   ├── clientes.ts
│   ├── configuracion.ts
│   ├── cuenta.ts
│   ├── empleados.ts
│   └── pedidos.ts
│
└── api/                    Route handlers
    ├── sync/productos/     GET + POST
    ├── sync/clientes/      GET + POST
    ├── multimedia/         PATCH + DELETE
    └── categorias-home/    PATCH + POST
```

---

## Flujo de autenticación

```
1. Request entra a src/proxy.ts (middleware)
2. updateSession() verifica cookie de sesión SSR
3. Si ruta /dashboard/* y no hay sesión → redirect /login
4. Si ruta /dashboard exacta y hay sesión → consulta profiles.rol
   - master|empleado|comisionista → /dashboard/admin
   - resto → /dashboard/cliente

Login:
  /login → POST action login() → signInWithPassword
    → consulta rol → redirect según rol interno o cliente

Logout:
  action logout() → signOut → redirect /login
```

---

## Flujo de pedidos

```
1. Cliente navega catálogo → agrega al carrito (Zustand, localStorage)
2. CartDrawer → "Enviar pedido"
3. crearPedidoBorrador() → crea pedido (estado: pendiente_pago) + items
4. PagoInstrucciones muestra datos bancarios según método
5. Cliente paga fuera de la web → sube comprobante
6. subirComprobante() → crea fila en comprobantes + estado: comprobante_subido
7. Admin ve comprobante → confirmarPago() → estado: pago_confirmado
8. Admin: en_preparacion → enviado → entregado
```

### Estados del pedido

| Estado | Quién | Descripción |
|---|---|---|
| `borrador` | Cliente | Carrito, no enviado |
| `pendiente_pago` | Cliente | Pedido enviado, esperando pago |
| `comprobante_subido` | Cliente | Subió comprobante |
| `pago_confirmado` | Admin / MP webhook | Pago verificado |
| `en_preparacion` | Admin | Armando pedido |
| `enviado` | Admin | Despachado |
| `entregado` | Admin | Recibido |
| `cancelado` | Admin / auto | Cancelado con nota |

---

## Flujo de sincronización Gesu

```
Gesu ERP (api_items.php / api_clieprov.php)
  │  GET con token en URL
  ▼
/api/sync/productos o /api/sync/clientes
  │  Pagina hasta data_fin >= data_tot
  │  Deduplica por codigoInterno
  │  Transforma al schema local
  ▼
Supabase: upsert batches de 100 (productos) / solo log (clientes)
  │
  ▼
sync_log: registra resultado de cada sync

Trigger:
  - Cron automático (vercel.json): productos cada 2h, clientes 1x/día
  - Manual desde /dashboard/admin/sync
```

---

## Patrones de código

- **Server components por defecto.** Solo `'use client'` cuando se necesita estado, hooks, efectos o eventos del browser.
- **Server actions en `src/app/actions/`.** Siempre con `'use server'` al tope. Nunca se llaman desde componentes server.
- **Optimistic UI:** `useTransition` + estado local, sin esperar respuesta del servidor.
- **Imágenes:** siempre `next/image` con `fill` + `sizes`.
- **Colores:** siempre `var(--color-*)` inline, nunca clases genéricas de Tailwind.
- **Tipos:** definidos localmente en cada archivo (no hay `src/types/` global).
