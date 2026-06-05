<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:deploy-rules -->
## Regla de pushes

- Hacer commits locales a medida que se avanza
- **NO hacer push sin que el usuario lo pida explícitamente**
- Solo pushear cuando los cambios estén consolidados (evitar deploys innecesarios en Vercel)
<!-- END:deploy-rules -->

<!-- BEGIN:conventions -->
## Convenciones críticas del proyecto

### Next.js 16.x — interceptación de requests
El archivo de middleware se llama `proxy.ts` (no `middleware.ts`) y exporta `proxy` (no `middleware`). El matcher excluye `auth/` para no romper el code_verifier de PKCE.

### Supabase browser client — nunca a nivel módulo
`createClient()` ejecutado fuera de `useEffect`/`useRef` falla en SSR (Turbopack lo ejecuta en el servidor). Patrón correcto para handlers:
```ts
const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
function getSupabase() {
  if (!supabaseRef.current) supabaseRef.current = createClient()
  return supabaseRef.current
}
```
Para `useEffect`-only: instanciar dentro del efecto.

### Zustand persist + SSR
`useCartStore` rehidrata desde `localStorage` en cliente. Cualquier UI que dependa de su estado necesita un flag `mounted` (`useState(false)` + `useEffect(() => setMounted(true), [])`); renderizar condicionalmente cuando `mounted === true`.

### Precios
- Siempre leídos desde DB (`precio_lista1/2/3/5`), nunca desde el cliente.
- Moneda: **ARS** (pesos argentinos). Formato con `formatPrecio()` → `$ X.XXX` (`es-AR`).
- Gesu mapea: Lista1→Distribuidor, Lista2→Local, Lista3→Mercha, Lista4→sin asignar, Lista5→Consumidor Final.
- La columna en DB se llama `total_usd` (legacy cosmético, no renombrar sin migración).
<!-- END:conventions -->

<!-- BEGIN:architecture -->
## Arquitectura — tienda por canal

### `src/lib/tienda.ts`
- `resolverCanalTienda()`: sesión → canal de venta → lista de precios.
  - Usuario con `canal_id` + `aprobado=true` → `mostrarPrecios=true`, devuelve `listaPrecio`.
  - Mayorista (`distribuidor|local|mercha`) con `aprobado=false` → `pendienteAprobacion=true`.
  - `consumidor_final` sin `canal_id` → resuelve canal en memoria sin escribir a DB.
  - Fallback (sin sesión): usa canal `consumidor_final` con `mostrarPrecios=false`. Canal `publico` existe en DB solo para el chatbot.
- `getProductosDelCanal(canalId)`: devuelve `{ ids, multiplos }` desde `producto_canales`.

### Sync Gesu (`src/app/api/sync/productos/route.ts`)
- Cada sync reactiva productos que vienen de Gesu (`activo: true` en upsert).
- Categorías nuevas en Gesu → `categorias_home` creada con `activo: true` automáticamente.
- Al final de cada sync: filas de `categorias_home` sin productos activos → `activo: false`.
- `keysAsignadas` solo cuenta categorías activas.
- `aprobarCliente()` en `actions/clientes.ts`: al aprobar, asigna `canal_id` cuyo slug coincide con `profiles.rol`.
- Filtro `CATEGORIAS_INTERNAS` excluye: `Preventa *`, `Productos Importados`, `Productos en Desarrollo`, `Bienes de Uso`, categorías `M)*` y `O)*`.

### Hero carousel — video externo
`hero_assets.url` puede ser path de Storage (`hero/archivo.mp4`) o URL completa (YouTube/Vimeo). `getEmbedUrl()` en `HeroCarousel.tsx` detecta el tipo y renderiza `<iframe>` o `<video>`. Al eliminar: omitir llamada a Storage si `url.startsWith('http')`.

### Auth
- `SupabaseAuthListener` (root layout): llama `router.refresh()` en `SIGNED_IN` y `TOKEN_REFRESHED`.
- `auth/callback/route.ts`: escribe cookies de sesión directamente en `NextResponse`.
- `(public)/layout.tsx`: async, obtiene sesión server-side y pasa `user` a `Header` y `PublicCartDrawer`.
- `src/app/page.tsx` (homepage `/`): también lee sesión y pasa `user` al Header (está fuera del grupo `(public)`).
<!-- END:architecture -->

<!-- BEGIN:schema -->
## Tablas y buckets relevantes

| Tabla | RLS — lectura | RLS — escritura |
|---|---|---|
| `hero_assets` | pública | master/empleado |
| `ofertas` | pública | master/empleado |
| `banners` | pública | master/empleado |
| `configuracion` | pública | master/empleado |
| `comunidad_fotos` | pública | master/empleado |
| `newsletter_suscriptores` | master/empleado | pública (INSERT) |
| `postulaciones` | master/empleado | pública (INSERT, rate limit 5/h por IP) |
| `corporativos` | master/empleado | pública via service client |
| `catalogos` | master/empleado/comisionista/distribuidor/local/mercha | master/empleado |
| `categorias_home` | pública | master/empleado |
| `producto_canales` | — | master/empleado |

### Columnas clave
- `pedidos`: `cliente_id` nullable, `guest_nombre`, `guest_email`, `guest_telefono`, `mp_preference_id`, `mp_payment_id`
- `productos`: `es_novedad boolean DEFAULT false`
- `producto_canales`: `multiplo integer DEFAULT 1`
- `profiles`: `razon_social`, `direccion`, `localidad`, `sitio_web`, `puntos_venta`
- `categorias_home`: `foto_url text`, `href text`
- `corporativos`: `logo_url text`

### Buckets Storage
`cv`, `multimedia` (categorías, banners, hero), `corporativos` (logos, adjuntos), `catalogos` (PDF privado, 20MB)
<!-- END:schema -->

<!-- BEGIN:features -->
## Features implementadas (resumen)

- **Postulaciones** — 3 formularios (fulltime/comisionista/proveedor), CV upload, panel admin con filtros
- **Hero carousel** — assets en Storage + YouTube/Vimeo embed; panel de gestión con editor de contenido
- **CategoryGallery** — grilla 4 col desktop, foto de portada manual o fallback a productos, auto-sincronizada con Gesu
- **FloatingActions** — WhatsApp, Ofertas, Hot Sale; drawers con productos de tabla `ofertas`
- **Tienda por canal** — precios diferenciados por rol; `PendingApproval` para mayoristas sin aprobar
- **PromoTicker** — animación por píxeles absolutos (velocidad uniforme mobile/desktop); configurable desde DB
- **Carrito** — Zustand persist, multiplos de cantidad, guest checkout (sin sesión), Mercado Pago Checkout Pro
- **Mercado Pago** — `iniciarCheckoutMP()` crea pedido + preferencia; webhook IPN en `/api/mp/webhook`; rollback si MP falla
- **Newsletter** — suscripción pública, panel admin con exportar CSV
- **Catálogos** — PDFs privados, signed URL 1h, solo roles habilitados
- **Corporativos** — formulario público con logo upload, panel admin con detalle expandible
- **Comunidad / Instagram** — `comunidad_fotos`, slider en homepage, oculto si vacío
- **Ofertas / Hot Sale** — tabla `ofertas`, panel editable con auto-sync precio⟷% descuento
- **Diseño** — 8 color pickers, `ThemeProvider` inyecta CSS vars, guardado en `configuracion`
- **Banco de imágenes** — gate server-side (sin sesión / pendiente / aprobado), URL Drive desde `configuracion`
- **Sidebar admin** — 5 grupos colapsables con acordeón y auto-expand por ruta activa
- **Roles** — `consumidor_final|distribuidor|local|mercha` no tienen `/dashboard`; rutas públicas `/cuenta` y `/pedidos`
- **Navbar** — sesión server-side, dropdown según rol, categorías desde DB
- **Páginas provisorias** — 12 rutas cubiertas: `/eventos`, `/franquicias`, `/faq`, `/terminos`, etc.
<!-- END:features -->

<!-- BEGIN:pending -->
## Pendiente

- **#35 Filtros en tienda** — auditar atributos en tabla `productos`; posiblemente requiere tabla `atributos`
- **Variables de entorno Vercel** — `MP_ACCESS_TOKEN` (token real MP) y `NEXT_PUBLIC_APP_URL` (dominio prod)
- **Email confirmación Supabase** — verificar template apunte al dominio de producción, no localhost
- **Dominio propio** — completar verificación Google Search Console con dominio del cliente (ver `docs/google-oauth-dominio.md`)
<!-- END:pending -->
