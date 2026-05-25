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

<!-- BEGIN:feactures -->
## Feactures implementadas

### Postulaciones (Trabaja con Nosotros)
- 3 formularios: fulltime (CV upload), comisionista (movilidad/zonas), proveedor (cargo/empresa/CUIT/web)
- Tabla `postulaciones` con RLS + bucket `cv` en Storage
- Server actions: crear, actualizar estado, eliminar
- Admin panel con tabla de postulaciones, panel de detalle, filtros y búsqueda
- Rate limit: 5 postulaciones/hora por IP
- Validación: longitud de campos, MIME type de CV, formato email
- Página web como texto libre (no URL estricta)
- Fallback a email en tabla admin si nombre es null

### Accordion de formularios (Trabaja con Nosotros)
- Layout accordion con 3 secciones (Fulltime, Comisionista, Proveedor)
- Solo un formulario abierto a la vez (ninguno por defecto)
- Animación suave con framer-motion (AnimatePresence)
- Responsive mobile

### Hero carousel (homepage)
- Tabla `hero_assets` con RLS (lectura pública, internos todo)
- Panel de gestión en Multimedia > Hero: upload, ordenar, activar/desactivar, eliminar
- Editor de contenido por asset: etiqueta, título, subtítulo, botón texto/url (drawer lateral)
- Carousel automático con AnimatePresence, flechas, dots y pausa
- Fallback estático (hero1.jpg) si no hay assets

### CategoryGallery (antes CategoryBento)
- Grilla regular 4 columnas desktop, 2 columnas mobile
- Imagen full-bleed, texto superpuesto inferior izquierdo sin overlay oscuro
- Mini thumbnails de fotos adicionales de productos en cada categoría
- Estilo editorial/fashion premium con tipografía blanca
- +X indicador si hay más fotos

### FloatingActions (botones flotantes)
- 3 botones en esquina inferior derecha: WhatsApp, Ofertas (Reloj), Hot Sale (Fuego)
- Stack vertical, fixed, hover scale
- Solo visible en páginas públicas (oculto en /dashboard)
- Ofertas y Hot Sale abren drawer lateral con animación slide-in
- Drawer claro (max-w-xl) con grid de cards: foto + título + precio + badge descuento
- Mockdata de ofertas (configurable desde panel a futuro)

### Dashboard — bump de legibilidad
- `text-xs` → `text-sm` (12px → 14px)
- `text-sm` → `text-base` (14px → 16px)
- `font-medium` agregado a labels y botones
- Aplicado a 28 archivos del dashboard (admin + cliente + sidebar)

### Frontend — secciones claras
- Contacto y Trabaja con Nosotros: fondo `acero-claro` (platinado azulado) en lugar de negro
- Textos en `granito-oscuro` (negro) para legibilidad
- Inputs con fondo blanco, botones oscuros, placeholder gris
- Secciones estilo platino/editorial minimalista

### Bug fixes de auditoría
- `e.currentTarget` null después de async (capturar form antes del await)
- Optimistic delete sin rollback (guardar y restaurar si falla server action)
- Path de upload con colisión (Date.now() + random suffix)
- Validación de tamaño en uploads (server-side)
- Confirmación de eliminación en Multimedia (evita borrados accidentales)
- Color `--foreground` en lugar de `--color-acero-brillo` en Postulaciones (compatibilidad light/dark)

### Ofertas y Hot Sale (panel + drawer)
- Tabla `ofertas`: id, canal (ofertas|hotsale), producto_id FK, precio_oferta, descuento_porcentaje, orden, activo
- Panel en `/dashboard/admin/ofertas` con:
  - Dropdown Ofertas / Hot Sale
  - Tabla editable: producto, precio lista, precio oferta, % descuento, orden
  - Precio oferta y % descuento se auto-sincronizan
  - Modal selector de producto con búsqueda
- Sidebar: agrupado bajo "Marketing" con Chatbot
- RLS: lectura pública (drawer FloatingActions), CRUD solo master/empleado
- FloatingActions aún usa mockdata (pendiente conectar a DB)

### Redes y contacto
- Link Instagram actualizado a https://www.instagram.com/reunata.ar/
- Todos los links de Instagram abren en nueva ventana (target="_blank")
- WhatsApp actualizado a +54 9 11 3272-0974
- WhatsApp en FloatingActions, Footer, Contacto, Pedidos
- "Trabaja con nosotros" removido del Header, solo en Footer

### Diseño (panel de control)
- Nueva sección "Diseño" en Multimedia > Diseño
- 8 color pickers editables: acero (brillo/claro/medio/oscuro), granito (claro/medio/oscuro), fondo general
- Vista previa en tiempo real al cambiar colores
- Guardado en tabla `configuracion`
- Restaurar colores originales
- Swatch circular clickable que abre el color picker
- `ThemeProvider` inyecta CSS variables en todas las páginas públicas

### Multimedia — tabla de fotos
- Grid visual de productos reemplazado por tabla compacta
- Columnas: Producto, Categoría, Fotos (miniaturas + badge), Acción
- Miniaturas superpuestas de hasta 3 fotos por producto
- Fila seleccionable con highlight, drawer lateral para gestión detallada
- Filtros por categoría y estado (con/sin foto) se mantienen

### Corporativos (panel + formulario)
- Tabla `corporativos`: nombre, empresa, email, teléfono, cuit, ubicación, ocasión, cantidades, productos[], personalizar, fecha_limite, estado
- Bucket `corporativos` en Storage para archivos adjuntos
- Panel en `/dashboard/admin/corporativos` con tabla, filtros (búsqueda, estado, ocasión), detalle expandible, aprobar/rechazar/eliminar
- Server actions: crear, actualizar estado, eliminar
- Formulario público en `/corporativos` con productos multiselect, personalizar sí/no, fecha límite
- RLS: insert público (service client), CRUD solo master/empleado

### Cinta promocional (PromoTicker)
- Texto rotativo horizontal infinito en homepage debajo del Hero
- Items y velocidad configurados desde tabla `configuracion` (claves `promo_items` y `promo_speed`) con fallback a defaults
- Editor en Multimedia > Cinta promocional: tag input (Enter → chip), drag reordenar, slider velocidad (10-60s)
- RLS: lectura pública, escritura solo master/empleado

### Banner promocional
- Banner único (no carrusel) antes del footer con imagen, título opcional, link opcional
- Tabla `banners`: url, titulo, link_url, activo
- Editor en Multimedia > Banner promocional: upload imagen, título, link, activar/desactivar, eliminar con confirmación
- Upload a `multimedia/banners/{timestamp}.webp`
- RLS: lectura pública, CRUD solo master/empleado

### Tienda pública (catálogo visible)
- `/tienda` y `/tienda/[slug]` muestran todos los productos activos (sin filtro de canal público)
- Categorías obtenidas dinámicamente desde `categorias_home` con sus `categoria_keys`
- Productos visibles sin precios (foto, título, código)
- CTA al pie: "Registrate para ver precios, stock y hacer pedidos"
- Registro necesario solo para ver precios y comprar (no para navegar el catálogo)

### Frontend — secciones claras
- Contacto, Trabaja con Nosotros y Nosotros: fondo `acero-claro` en lugar de negro
- Textos en `granito-oscuro` para legibilidad
- Inputs fondo blanco, botones oscuros, placeholder gris
- Cards con `border-2` y padding optimizado
- Secciones estilo platino/editorial minimalista

### Fusión Canales → Productos
- Sección Canales eliminada del sidebar y fusionada dentro de Productos como segundo tab (`?tab=canales`)
- `CanalesClient.tsx` movido a `src/app/dashboard/admin/productos/`
- Server actions de canales ahora revalida `/dashboard/admin/productos`
- Redirect 301 de `/dashboard/admin/canales` → `/dashboard/admin/productos?tab=canales`
- Tipos compartidos creados en `src/types/productos.ts`

### Instagram / Comunidad
- Tabla `comunidad_fotos` con RLS (lectura pública, internos CRUD)
- Dashboard en `/dashboard/admin/instagram/` con upload, caption, drag reorder, delete
- Server actions: agregarPost, eliminarPost, actualizarCaption, reordenarPosts, getPostsPublic
- InstagramSlider en homepage con embla-carousel, oculto si no hay posts
- Icono Instagram SVG inline, texto "Comunidad Reunata" destacado

### Registro Mayorista
- Migration agrega columnas a `profiles`: razon_social, direccion, localidad, sitio_web, puntos_venta, clientes_activos
- `handle_new_user()` actualizado para insertar nombre desde metadata
- Server action `registrarse()` con signUp + update perfil via service client
- Página `/registro` con tabs Minorista / Mayorista
- Mayorista: tipo (distri/local/mercha), razón social, CUIT, dirección, localidad, segmentación
- Admin clientes: fila expandible con datos completos de mayoristas
- Pendiente de aprobación por defecto (aprobado = false)

### Dashboard cliente diferenciado (mayorista vs minorista)
- `dashboard/cliente/page.tsx`: home diferenciada según rol
  - **Minorista** (`consumidor_final`): saludo + texto de bienvenida + 2 CTAs (Catálogo, Mis Pedidos)
  - **Mayorista** (`distribuidor`, `local`, `mercha`): saludo con razón social + panel de condiciones del canal (nombre, descripción, lista de precios activa) con color por tipo
  - Badge de rol con color propio: índigo (consumidor_final), cyan (distribuidor), verde (local), ámbar (mercha)
  - Texto de "Pendiente de aprobación" diferenciado: minorista genérico / mayorista menciona equipo comercial
- `cuenta/CuentaForm.tsx`: sección "Datos de empresa" condicional solo para mayoristas
  - Campos: razón social, dirección, localidad, sitio web, puntos de venta, clientes activos
  - Mismo estilo visual que secciones Contacto y Facturación
- `cuenta/page.tsx`: SELECT ampliado con todos los campos de empresa
- `actions/cuenta.ts`: `actualizarPerfil()` actualiza campos mayoristas si vienen en el form (minoristas no se ven afectados)

### Login — botón Google (visual)
- `GoogleLoginButton.tsx` como componente `'use client'` separado
- Logo G multicolor SVG oficial, fondo blanco, sombra sutil
- Posicionado entre el formulario y el link "Crear cuenta" con separadores "o continuá con" / "¿Sos nuevo?"
- Sin lógica OAuth por ahora — preparado para conectar `signInWithOAuth` cuando se habilite Google en Supabase

### Navbar — sesión 15/05
- Ícono carrito: `ShoppingBag` → `ShoppingCart` (lucide-react)
- "Agencia de Merchandising" lleva a `/registro?tab=mayorista` (antes iba a `/login`)
- "Mayoristas" es ítem independiente en el navbar al mismo nivel que Corporativos (antes estaba dentro del dropdown)
- `RegistroForm` acepta prop `defaultTab?: 'minorista' | 'mayorista'` — la página lo lee del searchParam `?tab=`

### Banner Promocional — sesión 15/05
- Altura fija responsiva: `h-64 / h-72 / h-80` con `object-cover` (antes `h-auto`, se estiraba)
- El campo `titulo` de la tabla `banners` se renderiza como texto overlay centrado sobre la imagen
- Componente: `src/components/sections/PromotionalBanner.tsx`

### Categorías Home — foto de portada (sesión 15/05)
- Migration: columna `foto_url text` en tabla `categorias_home`
- Panel `Multimedia > Categorías Home`: thumbnail + botones Subir/Cambiar/Quitar por categoría
- Badge "foto manual" cuando la categoría tiene foto propia
- Upload al bucket `multimedia/categorias/{id}/`
- `CategoryGallery`: usa `foto_url` de la categoría como portada; fallback a primera foto de productos asociados
- Componentes: `CategoriasClient.tsx`, `CategoryGallery.tsx`

### Corporativos — logo upload (sesión 15/05)
- Migration: columna `logo_url text` en tabla `corporativos`
- Formulario público `/corporativos`: campo de upload de logo (PNG/JPG/WEBP/SVG, máx 5MB)
- Validación en cliente: tipo MIME y tamaño
- Action `crearCorporativo`: sube logo al bucket `corporativos/logos/` y guarda `logo_url`
- Componentes: `CorporativosForm.tsx`, `src/app/actions/corporativos.ts`

### Footer — rediseño (sesión 15/05)
- Eliminada la sección "Tienda" del footer
- 4 columnas extendidas desktop: Empresa — Información — Soporte — Newsletter/Redes
- Accordions en mobile (siempre visible en desktop)
- Sin `max-width` restrictivo, padding amplio `px-8/16/24`

### Precios Gesu — limpieza (sesión 15/05)
- `precio_compra` (costo) eliminado de la vista del panel de productos
- Sigue en la DB y en el sync de Gesu — nunca se expone al frontend
- Las 5 listas de Gesu mapean: Lista1→Distribuidor, Lista2→Local, Lista3→Mercha, Lista4→sin asignar, Lista5→Consumidor Final y Público

### Trabaja con Nosotros — sesión 15/05
- Descripción del formulario Full Time actualizada: "En las oficinas de nuestra empresa (Ciudad de Buenos Aires)"

### Páginas provisorias — sesión 16/05
- 12 rutas que daban 404 ahora tienen página con mensaje adecuado a cada sección
- Rutas cubiertas: `/eventos`, `/franquicias`, `/puntos-de-venta`, `/catalogo`, `/banco-imagenes`, `/seguimiento`, `/faq`, `/terminos`, `/politicas`, `/arrepentimiento`, `/promociones`, `/recuperar-contrasena`
- Todas en el grupo `(public)` salvo `/recuperar-contrasena` (misma estructura que `/login`)
- Cada página tiene CTAs relevantes (WhatsApp, contacto, tienda, registro mayorista)
- `/arrepentimiento` incluye texto legal completo (art. 34, Ley 24.240)

### Tag "Más elegidos" en grilla de productos — sesión 16/05
- Tercer tag (violeta `#8b5cf6`) en `ProductosListaClient` junto a Oferta y Hot Sale
- `toggleDestacada(productoId, activo)` en `actions/ofertas.ts`: activa `destacada=true` en la primera foto del producto (o desactiva en todas)
- `productos/page.tsx` carga `destacadasIniciales` desde `producto_fotos` y lo pasa al cliente
- La estrella en Multimedia sigue funcionando — ambos tocan el mismo campo

### ProductSlider "Más elegidos" — mejoras UX — sesión 16/05
- Cada card es un `<button>` con `cursor-pointer`: al hacer clic agrega al carrito y abre `PublicCartDrawer`
- Cinta diagonal "Más vendido" en esquina superior izquierda de cada card (fondo `granito-oscuro`, texto `acero-brillo`)
- Eliminado `cursor-grab` — sin manito en ningún punto del slider

### PublicCartDrawer — sesión 16/05
- Conectado a `cartStore.cartOpen` / `setCartOpen` en lugar de `useState` local: cualquier componente puede abrirlo
- Movido al layout `(public)/layout.tsx` — disponible en homepage, tienda, colecciones, etc.
- Eliminado de `/tienda/[slug]/page.tsx` (ya está en el layout)

### InstagramSlider — sesión 16/05
- Reemplazado `embla-carousel` por scroll horizontal nativo (`overflow-x-auto`, `scrollbarWidth: none`)
- Componente pasó a Server Component (sin `'use client'`, sin hooks)
- Sin manito en ningún estado

### PromoTicker — velocidad uniforme — sesión 16/05
- La animación pasó de `x: ['0%', '-50%']` a píxeles absolutos: mide `scrollWidth` real con `useRef` y anima exactamente esa distancia
- Eliminado `md:text-base` (ahora siempre `text-sm`): el elemento tiene el mismo ancho en todos los breakpoints
- Resultado: velocidad idéntica en mobile y desktop

### Sidebar admin — reorganización con acordeón — sesión 16/05
- `navMaster` reorganizado en 5 grupos colapsables: Catálogo, Ventas, Contenido, Marketing, Equipo
- Inicio y Configuración son ítems standalone fuera de grupos
- Acordeón: solo un grupo abierto a la vez; al hacer clic en otro se cierra el anterior
- Auto-expand: al cargar, se abre automáticamente el grupo que contiene la ruta activa
- Si el grupo está cerrado pero contiene la ruta activa, el botón del grupo se ilumina
- Chevron animado (−90° cerrado → 0° abierto) con transición CSS

### Catálogos — sesión 16/05
- Tabla `catalogos`: id, titulo, url, activo, orden, created_at — RLS habilitado
- Acceso de lectura: master, empleado, comisionista, distribuidor, local, mercha (NO consumidor_final, NO anónimo)
- Escritura: solo master y empleado
- Bucket `catalogos` en Storage: privado, 20 MB máx, solo `application/pdf`
- Panel en `/dashboard/admin/catalogos`: subir PDF con nombre, listar, toggle activo/inactivo, descargar (signed URL 1h), eliminar con confirmación
- Server actions en `src/app/actions/catalogos.ts`: `subirCatalogo`, `eliminarCatalogo`, `toggleCatalogoActivo`
- "Catálogos" agregado al sidebar bajo el grupo Contenido

### Clientes sin dashboard — sesión 22/05
- Roles `consumidor_final`, `distribuidor`, `local`, `mercha` ya NO tienen dashboard
- Post-login redirigen a `/` en lugar de `/dashboard/cliente`
- `dashboard/layout.tsx` bloquea acceso a toda la sección `/dashboard/` para roles cliente → redirect a `/`
- Rutas públicas nuevas: `/cuenta` y `/pedidos` (con `/pedidos/[id]`) en el grupo `(public)` con header/footer normal
- `CuentaForm` y componentes de pago copiados a las nuevas rutas públicas
- Links internos de pedidos apuntan a `/pedidos/[id]` (antes `/dashboard/cliente/pedidos/[id]`)

### Navbar con sesión — sesión 22/05
- `(public)/layout.tsx` ahora es async y obtiene sesión server-side, pasa `user` al `Header` y `PublicCartDrawer`
- `Header` acepta prop `user?: { nombre, rol }`: muestra ícono `User` (hombrecito) siempre
  - Sin sesión: ícono lleva a `/login`
  - Con sesión cliente: dropdown con Mi cuenta → `/cuenta`, Mis pedidos → `/pedidos`, Cerrar sesión
  - Con sesión interna: dropdown con Panel de administración → `/dashboard/admin`
- Ícono de usuario en la zona de acciones (junto a Search y Cart), visible en mobile y desktop
- `logout()` ahora redirige a `/` en lugar de `/login`

### Carrito reactivo al login — sesión 22/05
- `PublicCartDrawer` acepta prop `user` y muestra footer diferenciado:
  - Sin sesión: "Iniciá sesión para ver precios" + botón "Iniciar sesión →" + "Registrate"
  - Con sesión: solo botón "Continuar comprando →" sin prompts de login
- Mismo comportamiento en el carrito inline del `Header`

### Fix sesión OAuth — sesión 22/05
- `auth/callback/route.ts` reescrito: las cookies de sesión ahora se escriben directamente en el `NextResponse`
  en lugar de vía `cookies()` de Next.js (que es read-only en Route Handlers)
- `SupabaseAuthListener` client component agregado al root layout: llama `router.refresh()` en cada cambio
  de sesión para invalidar el Router Cache de Next.js y forzar re-render de Server Components
- Archivo `proxy.ts` ya existía con `updateSession` correctamente implementado

### Google OAuth — configuración — sesión 22/05
- App name "Reunata" configurado en Google Cloud Console OAuth consent screen
- App publicada en modo Production (antes Testing)
- `https://znmqvjxdnslrrvsjquej.supabase.co/auth/v1/callback` agregado como Authorized redirect URI
- Supabase Site URL: `https://reunata.vercel.app`
- Dominio verificado en Google Search Console (meta tag en layout via `metadata.verification.google`)
- Pendiente: con dominio propio del cliente, completar verificación de propiedad (ver `docs/google-oauth-dominio.md`)

### Fix Google OAuth — login persistente — sesión 22/05 (segunda parte)
Tres bugs en cadena que impedían que el login con Google persista la sesión:

1. **`src/proxy.ts` no era middleware** — Next.js solo reconoce `src/middleware.ts`. El archivo
   `proxy.ts` exportaba `proxy` (no `middleware`) y nunca se ejecutaba, dejando `updateSession`
   sin correr en ningún request. Renombrado a `middleware.ts` con la función `middleware` correcta.
   El matcher excluye `auth/` para no interferir con el code_verifier de PKCE durante el callback.

2. **`SupabaseAuthListener` recreaba el cliente en cada render** — `createClient()` estaba fuera
   del `useEffect`, causando subscribe/unsubscribe constante que podía perder el evento `SIGNED_IN`
   justo después del redirect OAuth. Corregido con `useRef(createClient())`. También se agregó
   `TOKEN_REFRESHED` a la lista de eventos que disparan `router.refresh()`.

3. **Homepage renderizaba `<Header />` sin `user`** — `src/app/page.tsx` está fuera del grupo
   `(public)` y nunca leía la sesión del usuario, por lo que el Header siempre mostraba el ícono
   del navbar como "no logueado" (link a `/login`) sin dropdown de cuenta. El OAuth callback
   redirige a `/` por defecto (cuando no hay parámetro `next`), así que el login desde el navbar
   siempre terminaba en la homepage sin mostrar la sesión. Fix: leer el user con `createClient()`
   en la homepage y pasarlo como prop `user` al `Header`.

   Esto explica por qué el login desde el carrito funcionaba: el carrito usa `/login?next=/tienda`
   → callback redirige a `/tienda` (grupo `(public)`) → layout sí pasa `user` al Header.

### Bug fixes — sesión 23/05

#### Sync — desactivación de productos no-Reunata
- **Query rota:** `.not('codigo_interno', 'in', ...)` generaba `("ABC","DEF")` con comillas dobles
  extra que PostgREST no matcheaba. Corregido a `(ABC,DEF)` sin comillas → ahora funciona.
- **Variable fuera de scope:** `totalDesactivados` declarado dentro del `try` pero usado en el
  `return` final fuera de él → error de TypeScript que rompía el endpoint. Movida la declaración
  al mismo nivel que `totalUpserted`.
- **Sin feedback:** la respuesta ahora incluye `desactivados: number` y el panel muestra
  "X registros sincronizados · Y productos desactivados".
- **Toggle sin persistencia:** el checkbox "Desactivar productos que no son de Reunata" se reseteaba
  al navegar. Ahora persiste en `localStorage` (clave `sync:desactivarNoReunata`).
- Resultado validado: 123 registros sincronizados, 129 productos desactivados en producción.

#### createClient() fuera de useEffect/useRef — patrón sistemático
Varios componentes llamaban `createClient()` (browser Supabase client) a nivel módulo o en el
cuerpo del componente. Turbopack lo ejecuta durante SSR donde las APIs del browser no existen,
causando "Error in input stream". Corregido en:
- `DisenoClient.tsx` — movido a `useRef` con inicialización lazy
- `CategoriasClient.tsx` — ídem (era nivel módulo, el más grave)
- `CategoryGallery.tsx` — movido dentro del `useEffect` (solo se usaba ahí)

**Patrón correcto para componentes que necesitan Supabase en handlers:**
```ts
const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
function getSupabase() {
  if (!supabaseRef.current) supabaseRef.current = createClient()
  return supabaseRef.current
}
```
**Para componentes que solo usan Supabase en useEffect:** instanciar dentro del useEffect.

#### PromoTicker — framer-motion v12
- `animate={false}` no es válido en framer-motion v12 → error de runtime. Cambiado a `animate={{ x: 0 }}`.
- `JSON.parse(promo_items)` no validaba que el resultado fuera un array → posible crash en `.map()`.
  Ahora valida `Array.isArray(parsed) && parsed.length > 0` antes de `setItems`.

#### proxy.ts — convención Next.js 16.x
En Next.js 16.x la convención cambió: el archivo de interceptación de requests se llama `proxy.ts`
(no `middleware.ts`) y exporta `proxy` (no `middleware`). En sesión 22/05 se había renombrado a
`middleware.ts` para corregir un bug de OAuth; en esta sesión se revirtió al nombre correcto para
eliminar el warning de deprecación. La lógica de `updateSession` no cambió.

### Tienda como homepage + navbar desde DB — sesión 25/05
- `/tienda/page.tsx` tiene la misma estructura visual que `/`: Hero, PromoTicker, CategoryGallery, ProductSlider, InstagramSlider, PromotionalBanner
- `Header.tsx`: categorías del navbar vienen de `categorias_home` (DB), no mockdata
- Sync Gesu auto-genera `href` en `categorias_home` usando el slug de la categoría; parchea filas existentes con `href=null`
- `src/app/page.tsx` (homepage `/`) pasa `categorias` al Header desde DB para mantener consistencia

### Tienda por canal de venta — sesión 25/05

#### Arquitectura central: `src/lib/tienda.ts`
- `resolverCanalTienda()`: resuelve sesión del usuario → canal de venta → lista de precios
  - Si el usuario tiene `canal_id` y `aprobado=true`: activa `mostrarPrecios=true` y devuelve `listaPrecio`
  - Si el rol es mayorista (`distribuidor`, `local`, `mercha`) y `aprobado=false`: devuelve `pendienteAprobacion=true`
  - Si el usuario es `consumidor_final` sin `canal_id` (ej: recién registrado con Google): resuelve el canal `consumidor_final` en memoria sin escribir a DB
  - Fallback: canal `publico` si no hay sesión o no se pudo resolver
- `getProductosDelCanal(canalId)`: devuelve array de `producto_id` visibles para ese canal (tabla `producto_canales`)

#### Páginas de tienda filtradas por canal
- `/tienda/page.tsx` y `/tienda/[slug]/page.tsx` usan `resolverCanalTienda()` + `getProductosDelCanal()`
- Filtro `.in('id', filterCanal)` aplicado a todos los queries de productos
- Todos los campos de precio se seleccionan siempre (`precio_lista1/2/3/5`) y se elige el correcto en runtime con `producto[listaPrecio]`
- Slugs especiales `novedades` y `mas-vendidos` también respetan el canal
- Si `pendienteAprobacion`: render temprano de `<PendingApproval>` sin mostrar el catálogo

#### `PendingApproval` — pantalla para mayoristas sin aprobar
- Componente `src/components/sections/PendingApproval.tsx`
- Muestra nombre del usuario, explicación de que el formulario fue recibido, botón WhatsApp y link a `/cuenta`
- Visible para roles `distribuidor`, `local`, `mercha` que completaron el formulario pero aún no fueron aprobados por admin

#### Auto-asignación de canal al aprobar
- `aprobarCliente()` en `src/app/actions/clientes.ts`: cuando `aprobado=true`, busca el canal cuyo `slug` coincide con el `rol` del usuario y lo asigna en el mismo UPDATE
- Elimina el paso manual de asignar canal separadamente
- Slugs de canales coinciden exactamente con los valores de `profiles.rol`: `consumidor_final`, `distribuidor`, `local`, `mercha`

#### `ProductGridPublic` — precios y CTA consciente de sesión
- Prop `mostrarPrecios`: muestra precio solo cuando es `true` (usuarios con canal aprobado)
- Prop `estaLogueado`: diferencia el CTA
  - Sin sesión: "Registrate para ver precios" + botón a `/registro` + link a `/login`
  - Con sesión pero sin precios: "Contactanos para activar tu acceso" + botón a `/contacto`

#### Panel de productos — filtro de categorías internas Gesu
- Checkbox "Ocultar categorías sin activos" en `ProductosListaClient.tsx` (default: activado)
- Filtra grupos donde todos los productos están inactivos (ej: categorías de costos internos de Gesu)
- Persiste solo en estado local del componente
<!-- END:feactures -->
