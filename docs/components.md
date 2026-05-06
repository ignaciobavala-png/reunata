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
| `Hero` | Server | — | Full-screen con imagen bg. Busca `hero_assets` en BD; si no hay, renderiza `HeroFallback` (hero1.jpg) |
| `CategoryGallery` | Client | — | Galería 4 col desktop / 2 col mobile desde `categorias_home`. Imagen full-bleed + mini thumbnails de productos |
| `ProductSlider` | Client | `fotos: FotoDestacada[]` | Embla carousel de fotos destacadas |
| `PromoTicker` | Client | — | Ticker horizontal animado (derecha→izquierda) con promos. Entre categorías y ProductSlider |
| `InstagramSlider` | Client | — | Placeholder con link a Instagram (target="_blank") |
| `FloatingActions` | Client | — | Botones flotantes fijos (WhatsApp, Ofertas, Hot Sale). Solo en páginas públicas |
| `PostulacionForm` | Client | `tipo, titulo, descripcion` | Formulario reutilizable de postulación. Upload CV con validación MIME y tamaño |
| `PostulacionAccordion` | Client | — | Wrapper accordion con 3 formularios (Fulltime, Comisionista, Proveedor). Solo 1 abierto a la vez |

### Providers

| Componente | Tipo | Props | Descripción |
|---|---|---|---|
| `LenisProvider` | Client | `children` | Smooth scroll con Lenis |
| `ThemeProvider` | Client | `children` | Inyecta colores personalizados desde `configuracion` como CSS variables en el root. Colores: acero (4), granito (3), background |

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
| `PostulacionesClient` | `postulaciones` | Tabla con filtros por tipo/estado, búsqueda, detalle expandible, aprobar/rechazar/eliminar con rollback |
| `DisenoClient` | — | 8 color pickers (acero/granito/background), vista previa en tiempo real, restaurar default |
| `SyncPage` | — | Botones para disparar sync manual |

### Cliente

| Archivo | Props | Descripción |
|---|---|---|
| `CatalogoClient` | `productos, categorias` | Tabla con search + add-to-cart |
| `CuentaForm` | `profile, userId` | Formulario edición de perfil |
| `ComprobanteUploader` | `pedidoId` | Upload de archivo a Storage + server action |
| `PagoInstrucciones` | `pedidoId, total, cfg, estado` | Tabs por método de pago con datos copiables + WhatsApp |
