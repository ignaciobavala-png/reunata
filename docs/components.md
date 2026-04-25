# Componentes — Reunata Web

## Convenciones

- **Server component** por defecto. Sin `'use client'`.
- **Client component** cuando necesita: estado, hooks, efectos, eventos del browser, o context de React.
- Props siempre tipadas inline en la función.
- No hay Storybook ni documentación de diseño más allá de este archivo.

---

## `src/components/`

### Layout

| Componente | Tipo | Props | Descripción |
|---|---|---|---|
| `Header` | Client | — | Fixed transparent/white según scroll. Logo, nav, menú mobile, iconos carrito/usuario |
| `Footer` | Server | — | 4 columnas: tienda, empresa, cuenta, newsletter |
| `Sidebar` | Client | `rol, nombre` | Nav del dashboard. Varía según rol (master=9 items, empleado=4, comisionista=3, cliente=4) |

### Sections (Home)

| Componente | Tipo | Props | Descripción |
|---|---|---|---|
| `Hero` | Client | — | Full-screen con imagen bg, animación, CTAs |
| `CategoryBento` | Server | — | 4 cards desde `categorias_home`, fotos aleatorias, fallback gradiente |
| `ProductSlider` | Client | `fotos: FotoDestacada[]` | Embla carousel de fotos destacadas |
| `InstagramSlider` | Client | — | Placeholder con link a Instagram |

### UI

| Componente | Tipo | Props | Descripción |
|---|---|---|---|
| `FadeIn` | Client | `children, delay?, className?, direction?` | Wrapper de animación scroll con framer-motion |
| `CartDrawer` | Client | — | Slide-out del carrito. Usa `useCartStore`. Botón enviar pedido |

---

## Dashboard Client Components

Ubicados en `src/app/dashboard/` junto a sus páginas.

### Admin

| Archivo | Props | Descripción |
|---|---|---|
| `CanalesClient` | `productos, canales, asignacionesIniciales, categorias` | Matriz producto↔canal con toggle individual y bulk |
| `ClientesClient` | `clientes, canales` | Lista de clientes con aprobar/revocar + asignar canal |
| `EmpleadosClient` | `empleados` | Invitar por email + desactivar internos |
| `MultimediaClient` | `productos, fotosIniciales, supabaseUrl, supabaseKey` | Upload drag-drop con WebP resize, badges, filtros, ⭐ destacadas |
| `CategoriasClient` | `categoriasIniciales` | CRUD de categorías de portada |
| `SyncPage` | — | Botones para disparar sync manual |

### Cliente

| Archivo | Props | Descripción |
|---|---|---|
| `CatalogoClient` | `productos, categorias` | Tabla con search + add-to-cart |
| `CuentaForm` | `profile, userId` | Formulario edición de perfil |
| `ComprobanteUploader` | `pedidoId` | Upload de archivo a Storage + server action |
| `PagoInstrucciones` | `pedidoId, total, cfg, estado` | Tabs por método de pago con datos copiables + WhatsApp |
