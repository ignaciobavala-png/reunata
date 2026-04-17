# Reunata — Marketplace Mayorista de Mate

> Guía de proyecto para desarrollo con Claude. Leer antes de cada sesión de trabajo.

---

## Qué es Reunata

Reunata es una tienda **mayorista B2B** que importa y distribuye productos relacionados a la cultura del mate:

- Mates (calabaza, madera, acero, silicona, cuero)
- Termos y vasos térmicos de doble pared
- Bombillas (acero inoxidable, alpaca, filtro)
- Yerbas seleccionadas (importadas y nacionales)
- Accesorios (portatermos, sets de regalo, soportes)

**Público objetivo:** revendedores, kioscos, regalerías, distribuidores y tiendas de delicatessen. El cliente compra en cantidad mínima (por docena/caja). No es una tienda de retail común.

**Identidad de marca:** acero inoxidable + granito. Estilo editorial de lujo, minimalismo extremo, mucho espacio negativo. Renovado, moderno, sin folklore kitsch.

---

## Stack Técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS v4 |
| Fuentes | DM Serif Display (títulos) · DM Sans (cuerpo) |
| Animaciones | Framer Motion 12 |
| Scroll suave | Lenis 1.3 |
| Carruseles | Embla Carousel React 8 |
| Estado global | Zustand 5 |
| Iconos | Lucide React |
| Utilidades CSS | clsx + tailwind-merge (`cn()` en `src/lib/utils.ts`) |
| Package manager | pnpm |
| Base de datos | Supabase (PostgreSQL) — **pendiente** |
| Auth | Supabase Auth con RLS — **pendiente** |
| Deploy | Vercel — **pendiente** |

---

## Paleta de Colores

Todos los tokens están en `src/app/globals.css` y expuestos como utilidades Tailwind:

```
Acero Inoxidable:
  --color-acero-brillo:   #ECEEF1   (fondos claros, highlights)
  --color-acero-claro:    #D4D9E0   (bordes, separadores)
  --color-acero:          #A8B0BB   (textos secundarios)
  --color-acero-oscuro:   #6E7882   (labels, placeholders)

Granito:
  --color-granito-claro:  #5A5F66   (textos terciarios)
  --color-granito:        #2E3135   (textos secundarios oscuros)
  --color-granito-oscuro: #111316   (fondo oscuro, overlays)

Semánticos:
  --background:   #F0F1F3
  --foreground:   #0D0F11
  --border:       rgba(13,15,17,0.1)
```

**Regla:** usar siempre los tokens de marca (`var(--color-*)`) en lugar de colores Tailwind genéricos (`gray-*`, `zinc-*`, etc).

---

## Estructura de Archivos

```
src/
├── app/
│   ├── globals.css            ← tokens de diseño y reset
│   ├── layout.tsx             ← fuentes + LenisProvider
│   └── page.tsx               ← composición de secciones home
├── components/
│   ├── layout/
│   │   ├── Header.tsx         ← sticky, blanco sobre hero → oscuro al scroll
│   │   └── Footer.tsx         ← "REUNATA" gigante + 4 columnas + newsletter
│   ├── sections/
│   │   ├── Hero.tsx           ← full-screen imagen/video + título centrado
│   │   ├── CategoryBento.tsx  ← grid asimétrico cols-12
│   │   ├── ProductSlider.tsx  ← Embla snap, tarjetas 3:4
│   │   └── InstagramSlider.tsx← Embla dragFree sin botones
│   └── ui/
│       └── FadeIn.tsx         ← wrapper whileInView reutilizable
├── lib/
│   └── utils.ts               ← cn() = clsx + tailwind-merge
└── providers/
    └── LenisProvider.tsx      ← smooth scroll global (Lenis)
public/
├── fotos/                     ← hero1.jpg, productos, categorías
├── videos/                    ← hero.mp4 (cuando esté disponible)
└── logo.png
```

---

## Convenciones de Código

- **Server vs Client:** componentes de sección son Server Components por defecto. Agregar `'use client'` solo si necesitan estado, hooks o animaciones interactivas.
- **Animaciones:** usar `<FadeIn>` para entradas al viewport. Para animaciones de carga inicial usar `motion.*` con `animate` directo (sin `whileInView`).
- **Tipografía en JSX:** los títulos usan `style={{ fontFamily: 'var(--font-display)' }}` porque Tailwind v4 con `@theme inline` resuelve en build time, no en runtime.
- **Imágenes:** siempre `next/image` con `fill` + `sizes`. Nunca `<img>` nativo.
- **Colores:** usar `var(--color-nombre)` inline o como clase arbitraria de Tailwind. No usar paleta Tailwind genérica.
- **Header sobre hero oscuro:** el logo recibe `brightness-0 invert` para aparecer blanco. Al hacer scroll pasa a modo normal.

---

## Comandos

```bash
pnpm dev        # desarrollo local con Turbopack
pnpm build      # build de producción (verificar antes de cada PR)
pnpm lint       # ESLint
```

---

## Roadmap

### ✅ Fase 1 — Base y Home (completada)
- [x] Setup Next.js 16 + Tailwind v4 + librerías
- [x] Sistema de diseño: tokens acero/granito, tipografía DM Serif/Sans
- [x] Lenis smooth scroll global
- [x] Header sticky con transición transparente → sólido + contraste sobre hero
- [x] Hero full-screen con imagen de fondo y título centrado animado
- [x] Category Bento Grid asimétrico (grid-cols-12)
- [x] Product Snap Slider (Embla)
- [x] Instagram Free Scroll Slider (Embla dragFree)
- [x] Footer con "REUNATA" gigante + 4 columnas + newsletter

---

### 🔲 Fase 2 — Catálogo y Producto
- [ ] `/tienda` — grid de productos con filtros por categoría
- [ ] `/tienda/[slug]` — detalle de producto
  - Galería de imágenes (Embla)
  - Precio mayorista vs. precio unitario
  - Cantidad mínima de compra por caja/docena
  - Botón "Agregar al pedido"
- [ ] `/colecciones/[slug]` — landing por categoría
- [ ] Carrito lateral (Sheet/drawer) con Zustand
  - `useCartStore`: items, cantidades, subtotal
  - Validación de mínimo de pedido para habilitar checkout

---

### 🔲 Fase 3 — Supabase: Base de Datos y Auth

> **Para Claude:** antes de empezar esta fase, el usuario debe crear el proyecto en Supabase y proveer las env vars. No asumir que existen.

#### Instalación
```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

#### Variables de entorno (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # solo server-side, nunca exponer al cliente
```

#### Esquema de tablas (diseño previsto)

```sql
-- Roles
create type user_role as enum ('admin', 'mayorista', 'pendiente');

-- Perfiles (extiende auth.users de Supabase)
create table profiles (
  id uuid references auth.users primary key,
  role user_role default 'pendiente',
  razon_social text,
  cuit text,
  telefono text,
  created_at timestamptz default now()
);

-- Productos
create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  category text,
  price_mayorista numeric,
  price_unit numeric,
  min_quantity int default 1,
  stock int default 0,
  images text[],
  active boolean default true,
  created_at timestamptz default now()
);

-- Pedidos
create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  status text default 'pendiente',
  total numeric,
  notes text,
  created_at timestamptz default now()
);

-- Items de pedido
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  product_id uuid references products(id),
  quantity int,
  unit_price numeric
);
```

#### RLS prevista
- `profiles`: usuario ve/edita solo su perfil. Admin ve todos.
- `products`: lectura solo para mayoristas aprobados. Escritura solo admin.
- `orders`: usuario ve solo sus pedidos. Admin ve todos.
- `order_items`: acceso ligado al pedido del usuario.

#### Patrón de clientes Supabase (lazy — obligatorio en Next.js)
```ts
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (c) => c.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        ),
      },
    }
  )
}

// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

---

### 🔲 Fase 4 — Panel de Control Admin
- [ ] Ruta protegida `/admin` (solo rol `admin`, verificado en proxy.ts)
- [ ] Dashboard: pedidos del día, stock crítico, mayoristas pendientes de aprobación
- [ ] CRUD de productos con upload de imágenes a Supabase Storage
- [ ] Gestión de usuarios: aprobar/rechazar mayoristas
- [ ] Vista de pedidos con cambio de estado

---

### 🔲 Fase 5 — Checkout y Pedidos
- [ ] Formulario de pedido mayorista (no es checkout e-commerce estándar)
- [ ] Confirmación por email (Resend)
- [ ] `/mis-pedidos` para el mayorista
- [ ] Integración de pago (a definir: MercadoPago o transferencia bancaria)

---

### 🔲 Fase 6 — Deploy
- [ ] Proyecto en Vercel vinculado al repo
- [ ] Variables de entorno en Vercel Dashboard
- [ ] Dominio personalizado
- [ ] Revisar `next.config` para optimización de imágenes remotas (Supabase Storage)

---

## Notas Importantes para Claude

1. **No es retail:** los precios son por caja/docena. El flujo no es "pagar online" sino "armar pedido → confirmar con ventas".
2. **Mayoristas pendientes:** rol por defecto al registrarse. Un admin debe aprobar antes de que vean precios o hagan pedidos.
3. **Hero media:** actualmente `public/fotos/hero1.jpg`. Cuando haya video, reemplazar `<Image>` en `Hero.tsx` por `<video>` apuntando a `public/videos/hero.mp4`.
4. **`pnpm build` siempre antes de reportar una tarea como completa.**
5. **Lucide React v1.8.0:** algunos íconos clásicos como `Instagram` no existen. Verificar con el build antes de asumir que un ícono está disponible.
