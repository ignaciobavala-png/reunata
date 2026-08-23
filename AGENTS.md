# AGENTS.md — web

> Generado automáticamente por brain-agents-inject desde brain-data.
> No editar manualmente — se sobreescribe al abrir Claude Code.

## Proyecto

| Campo | Valor |
|-------|-------|
| Nombre | web |
| Tipo | — |
| Cliente | — |
| Stack | Next.js 16.2.4 + React 19.2.4 + Supabase + Tailwind + MercadoPago + Zustand + Framer Motion + Lenis + Playwright + TypeScript + Vercel + E-commerce |
| Estado | desconocido |
| Último commit | — |

## Pendientes — Resend (mails transaccionales)

- Resend **instalado** (23/08): `resend@6.22.0` + `react-email@6.9.2`, `src/lib/resend.ts` con lazy init, script `pnpm email`, dir `emails/`.
- **Falta `RESEND_API_KEY`** en `.env.local` (está vacía) y en Vercel. Se conecta esta semana.
- Con la key: configurar SMTP en Supabase Auth (`smtp.resend.com`) para que el mail de recuperación llegue a clientes reales, y pasar el flujo a `token_hash` (hoy PKCE en `/auth/callback`, rompe si el link se abre en otro dispositivo).

## Perfil del desarrollador

# SKILL — perfil-desarrollador

## Descripción
Perfil técnico del desarrollador Ignacio Bavala. Define el stack tecnológico, convenciones y preferencias para cualquier proyecto nuevo.

## Cuándo usarla
- Al iniciar un proyecto nuevo
- Cuando necesites saber qué stack usar por defecto
- Para mantener consistencia tecnológica entre proyectos

## Cómo dirigirse a él

**Ignacio es hombre.** En español rioplatense los adjetivos van en masculino:
"vos solo", "quedaste tranquilo", "avisame cuando estés listo". Ojo con las
concordancias que se cuelan al escribir rápido ("sola", "lista", "preparada").

Tuteo con voseo, registro directo, sin formalismos.

## Cómo entregar lo que se produce

**Los entregables van como archivos locales, en la ruta que él pida.** Si pide
"dejámelo en el escritorio", eso es el entregable completo — no hay que
complementarlo publicándolo en ningún lado.

**No publicar artifacts ni subir nada a un servicio externo sin preguntar.**
Dicho por Ignacio el 19/08/2026, después de que se publicara un instructivo para
un cliente suyo sin consultarlo. El razonamiento de que "un link se comparte más
cómodo que un adjunto" puede ser cierto, pero **cómo se distribuye material de
un cliente es decisión de él, no del agente**, y publicar manda contenido a un
servicio externo. Si parece que un link ayudaría, se ofrece y se espera el sí.

Corolario práctico: un HTML que se va a mandar por WhatsApp conviene que sea
**liviano**. Un logo PNG embebido en base64 infla el archivo ~1,33x sobre el peso
del PNG (75 KB → 100 KB). Preferir SVG embebido o tipografía.

## Stack por defecto para nuevos proyectos

```
Framework:    Next.js 16 (App Router)
UI:           React 19 + Tailwind CSS v4 + Framer Motion v12
Estado:       Zustand v5
DB:           Supabase (PostgreSQL + Auth + Storage + RLS)
Deploy:       Vercel (cuenta Pro — sin límite de frecuencia de crons)
Package:      pnpm
Linting:      ESLint 9 (flat config)
Lenguaje:     TypeScript strict
```

**Páginas livianas → Cloudflare** (Workers + Static Assets, D1/SQLite opcional, wrangler v4),
en vez de Next.js+Supabase+Vercel. Para arrancar cualquiera de los dos: scaffold
[[scaffold-nextjs-supabase]] (`kickstart`, targets `vercel` y `cloudflare`).

## Convenciones

- Server Components por defecto, Client Components solo cuando hay interactividad
- State global con Zustand v5 (no Context a menos que sea trivial)
- Animaciones con Framer Motion v12
- Estilos con Tailwind v4, configuración vía CSS `@theme` tokens
- Migraciones SQL como archivos `.sql` planos
- `vercel.json` con crons para keep-alive de Supabase
- Cada proyecto necesita su `AGENTS.md`
- **Next.js 16**: `middleware.ts` fue renombrado a `proxy.ts`; exportar `export function proxy(request)` en vez de `middleware`. Runtime Node.js por defecto. Codemod: `npx @next/codemod@canary middleware-to-proxy .`
- Sin testing, sin Docker
- Sin CSS-in-JS más allá de Tailwind
- `@/*` como path alias (apunta a `./*` o `./src/*`)
- **No subir binarios a git/GitHub** (fonts, imágenes pesadas, videos, PDFs): no se comprimen, no se pueden diffear, inflan el clone para siempre aunque se borren después, y hay límites duros de tamaño en GitHub. Para assets de proyecto usar Supabase Storage o Vercel Blob y referenciar por URL. Excepción: binarios chicos e imprescindibles para el build (ej. un logo o una fuente puntual) pueden ir directo al repo.

## Herramientas propias (~/bin)

Los scripts viven en `~/bin`, **fuera del vault** (nunca se suben a GitHub). Acá va
lo mínimo para saber que existen; el detalle completo está en [[areas/sistema-agente]].

- **`recibo`** — genera recibos de pago en HTML + PDF con el formato estándar de
  Ignacio (número, "Recibí de", monto en letras, "En concepto de", tabla
  total/seña/saldo, disclaimer "No válido como factura"). Usar cuando pidan emitir
  un recibo o seña de un cobro:
  `recibo --cliente "Escuela Sónica" --suma 200 --total 650 --moneda USD --concepto "Seña ..."`.
  El número auto-incrementa y los montos pasan a letras en español (pesos/dólares).

## ESLint

Usar flat config (`eslint.config.mjs`) con la config nativa de Next 16
(`FlatCompat` legacy rompe con `eslint-config-next@16`):

```js
import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
])

export default eslintConfig
```

## Skills relevantes para este proyecto

Ruta de cada skill: `/home/nch/Escritorio/brain-data/skills/<nombre>/SKILL.md`

Esto es un índice, no el contenido. Leer el archivo completo solo si la tarea actual lo requiere.

- `react-email-resend` — **React Email + Resend — setup, migración v6 y patrones de envío**
  Al conectar envío de emails transaccionales o campañas de mailing en un proyecto Next.js + Supabase. Aplica…
- `cloudflare-wrangler-deploy` — **Cloudflare Wrangler — setup, assets estáticos y deploy seguro**
  Cualquier proyecto con `wrangler.jsonc`/`wrangler.toml` (Worker o sitio estático servido con…
- `supabase-oauth-nextjs` — **Google OAuth con Supabase SSR en Next.js 16**
  Guía completa para instalar Google OAuth en Next.js 16 (App Router) con `@supabase/ssr`. Incluye los bugs…
- `enviopack-nextjs` — **Enviopack en Next.js — integración completa de cotización de envíos**
  Cuando un proyecto argentino necesite cotización de envíos a domicilio. Enviopack agrega múltiples…
- `supabase-storage-egress` — **Supabase Storage — egress, límites y buenas prácticas**
  Al subir archivos a Supabase Storage, especialmente videos o imágenes pesadas que se sirven públicamente.…
- `supabase-postgres-best-practices` — **Supabase + Postgres — esquemas, RLS y queries eficientes**
  Al diseñar tablas, escribir políticas RLS, optimizar queries, o integrar Supabase con Next.js 16.
- `nextjs-app-router-patterns` — **Next.js 16 — App Router patterns y convenciones**
  Al iniciar o trabajar en cualquier proyecto Next.js: estructura de rutas, data fetching, Server Actions…
- `typescript-advanced-types` — **TypeScript strict — tipos útiles en el stack Next.js + Supabase**
  Al definir tipos para API responses, props de componentes, Server Actions, datos de Supabase, o cuando TS…
- `client-side-image-compress` — **Comprimir imágenes client-side antes de subir al storage**
  Siempre que se implemente un uploader de imágenes (flyers, avatares, fondos, productos, etc.). Sin…
- `cms-listas-claves-numeradas` — **Listas de contenido con claves numeradas — el admin edita pero no deja agregar ni borrar**
  Cuando un CMS propio guarda una **lista** como filas sueltas con clave numerada (`includes_1`, `includes_2`…
- `tailwindcss-mobile-first` — **Tailwind CSS v4 — configuración y patrones mobile-first**
  Al configurar Tailwind v4 en un proyecto nuevo, definir tokens de diseño, o implementar layouts responsivos.
- `vercel-dominio-cert-sin-emitir` — **Dominio agregado en Vercel antes de que exista el DNS: queda verified pero sin certificado, y no reintenta**
  Cuando se activa un dominio o subdominio nuevo en Vercel y el navegador muestra "la conexión no es segura" /…
- `postgres-revoke-column-grant-no-op` — **revoke de columna es un no-op si el rol tiene el privilegio a nivel tabla (escalada de privilegios en Supabase)**
  Cada vez que una tabla con RLS tenga una columna que el dueño de la fila **no** debe poder editar…
- `roles-lista-fija-vs-canales-dinamicos` — **Roles enumerados a mano cuando en realidad los crea el admin desde el panel**
  Cuando el proyecto tiene una tabla configurable por el admin que define "tipos de usuario" (`canales`…
- `iframe-tercero-breakpoint-del-proveedor` — **Embeber un checkout/widget de terceros — el ancho del contenedor lo manda el breakpoint del proveedor**
  Cuando se embebe en un iframe el checkout, formulario o widget de otro producto (ticketeras, pasarelas de…
- `supabase-auth-mail-token-hash` — **Mails de auth de Supabase: token_hash en vez de PKCE, y el mailer que solo entrega al equipo**
  Al implementar recuperación de contraseña, confirmación de cuenta, magic link o invitaciones con…
- `ai-sdk-chatbot-grounded` — **Chatbot FAQ grounded con AI SDK v5 + Groq (widget Q&A)**
  Al agregar un widget de preguntas frecuentes / asistente virtual a un sitio, cuando la respuesta debe estar…
- `jeeliz-web-ar-tryon` — **Jeeliz FaceFilter + Three.js — Web AR try-on**
  ## Cuando usarla Al integrar el face tracker Jeeliz FaceFilter con Three.js en una app React (Vite) para…
- `nextjs-persistent-shell-nav` — **Navegación con shell persistente (route group + framer-motion)**
  Cuando querés que la navegación entre páginas se sienta como **un mismo espacio que muta** (sensación "redes…
- `vercel-react-best-practices` — **Vercel + React — performance y patrones críticos**
  Al optimizar una página lenta, reducir el bundle, revisar re-renders, o hacer deploy en Vercel.
- `onboarding-guest-rollback-storage-rls` — **Onboarding multi-paso con guest+fotos — rollback en fallo y RLS de storage por dueño**
  Cuando un flujo público (sin login) crea una fila "dueña" (guest, invitado, registro) y después, en el mismo…
- `soft-delete-filtro-incompleto` — **Soft delete sin filtrar `active` en todas las lecturas**
  Cuando "borré algo desde el admin y volvió a aparecer" — en el listado del admin, en la home, en el listado…
- `rls-formulario-por-etapas-insert-encadenado` — **formularios en varias etapas con RLS - encadenar INSERTs en vez de completar una fila**
  Cuando un proceso que hoy es un formulario tenga que partirse en etapas con algo en el medio que decide otro…
- `tailwind-clases-conflicto-orden-hoja` — **Bug silencioso — `hidden` no oculta si el componente ya trae `flex`/`inline-flex` en su base**
  Cada vez que un componente propio arme su `class` concatenando una base fija con un `className` que recibe…
- `precio-usd-cobro-pesos-cotizacion` — **Publicar en USD y cobrar en pesos — cotización en cascada, una sola vez por request y congelada en la orden**
  Cuando el negocio razona en dólares (importados: vinilo, indumentaria, electrónica) pero cobra en pesos.…
- `input-file-hidden-click-ios-webview` — **\"El botón de subir foto no hace nada\" — input file con display:none + .click() por JS**
  Cuando el cliente/usuario reporta que **aprieta "Subir foto" y no pasa nada**: no abre el selector de…
- `desglose-precios-cerrar-contra-total` — **Desglose de precios guardados — despejar contra el total, no recalcular la cascada**
  Cuando hay que **mostrar el desglose** (subtotal / IVA / descuentos / envío) de un pedido o factura **ya…
- `scaffold-nextjs-supabase` — **Scaffold Next.js 16 + Supabase (kickstart)**
  Al arrancar cualquier proyecto nuevo. En vez de re-hacer el setup a mano y re-debuggear los mismos bugs…
- `hover-touch-tailwind-v4` — **Hover en touch — Tailwind v4 ya lo protege, tu CSS a mano no**
  Al hacer tarjetas, grillas de servicios o cualquier elemento con efecto de hover que también se va a ver en…
- `duplicados-por-formato-de-nombre` — **Duplicados por formato de nombre y el mailto que los enmascara**
  Cuando una tabla de personas tiene duplicados después de importar desde Google Sheets / Excel, o cuando el…
- `agente-ia-operaciones-vs-escrituras` — **Agente IA — operaciones de negocio vs escrituras de tabla**
  Al darle a un agente LLM la capacidad de escribir en una base de datos de negocio. Aplica en cuanto el…
- `checkout-referencia-externa-huerfana` — **Bug silencioso — referencia externa huérfana al reintentar un pago**
  Al integrar cualquier pasarela de pago (Mercado Pago, Stripe, MODO, PayPal) donde: se genera una…
- `registro-antes-de-window-open` — **Registrar datos antes de window.open sin que el popup se bloquee**
  Cuando un click tiene que **guardar algo en el server Y abrir una ventana nueva**: checkout que abre `wa.me`…
- `upsert-acumulativo-oculta-el-registro-nuevo` — **Upsert acumulativo con clave más gruesa que la entidad oculta el registro nuevo**
  Cuando el usuario dice "lo cargué y no se registra" pero la operación devuelve `success: true` y la tabla…
- `css-marquee-infinito-dos-tracks` — **Marquee CSS infinito — dos tracks, no uno animado a -50%**
  Cuando hay una franja de texto que scrollea en loop (ticker de promos, "envío gratis", mensajes de marca) y…
- `uploader-path-fijo-cache` — **Uploader con path fijo — la foto nueva nunca se ve (URL idéntica + CDN)**
  Cuando el cliente/admin dice **"subo la foto y no cambia nada en el sitio"** y en la DB la fila del asset no…
- `form-not-null-huerfano-y-rate-limit-global` — **Campo sacado del form + columna NOT NULL huérfana (y rate limit global que bloquea a todos)**
  Cuando un formulario público (contacto, postulación, alta, solicitud) **dejó de funcionar sin que nadie…
- `rls-insert-select-returning` — **RLS — `.insert().select()` falla si el rol tiene INSERT pero no SELECT**
  Cuando un formulario público (registro, inscripción, contacto, alta de lead) que escribe con el rol `anon`…
- `config-vacia-degrada-en-silencio` — **Config vacía que degrada en silencio — el string vacío interpolado en una URL**
  Cualquier valor de configuración que: se guarda en una tabla `settings` (o env var) con **default `''`**, se…
- `supabase-bucket-publico-select-listing` — **Bucket público de Supabase — la policy de SELECT abierta deja listar todo**
  Al crear cualquier bucket de Supabase Storage con `public: true` (avatares, portadas, adjuntos), y al copiar…
- `drawer-guardar-sin-propagar-estado` — **Guardar en un drawer/modal sin propagar al listado — "guardo y sigue el valor viejo**
  Cuando el cliente/admin reporta: **"edito, pongo guardar, dice guardado, y sigue apareciendo lo viejo.…
- `inputs-decimales-coma-es-ar` — **Inputs decimales en es-AR — coma como separador y estado string**
  Siempre que un formulario React/Next.js tenga campos numéricos con decimales (dimensiones, peso, precios…
- `columna-orden-empatada` — **Columna `orden` sin unicidad — cada consulta desempata distinto y "mover" no mueve**
  Cuando el cliente o el tester reporta que **el orden que ve en el admin no es el que se ve en el sitio**, o…
- `ruta-publica-sirve-bucket-entero` — **Archivo privado nuevo en un bucket que ya tenía ruta pública — la ruta vieja lo sirve**
  Cuando se agrega un **tipo de archivo nuevo** (comprobantes de pago, DNI, contratos, exports) a un…
- `details-solo-el-boton-abre` — **<details> donde solo un botón abre, y que se expanda a todo el ancho de la grilla**
  Cuando hay que hacer un acordeón, una ficha ampliada o un "ver más" **sin JavaScript**, y aparece alguno de…
- `flag-de-seccion-en-fila-hija` — **Flag de sección puesto en la fila hija — el padre sale repetido**
  Cuando una sección del sitio ("Más elegidos", "Destacados", "Lo nuevo", una galería de home) se arma a partir…
- `postgres-view-select-star-congelado` — **Postgres congela el `SELECT *` de una view al crearla**
  Cuando una view creada con `SELECT tabla.*` "no trae" columnas que sí existen en la tabla, o cuando un campo…
- `reserva-stock-puerta-unica` — **Reserva de stock en piezas únicas — cuándo descontar, puerta única e idempotencia**
  En cualquier catálogo con **stock chico o piezas únicas** (vinilos, vintage, obra, artesanía) donde `stock =…
- `versionado-por-trigger-snapshot-diff` — **Historial de versiones genérico con un solo trigger (snapshot + diff)**
  Cuando el cliente pide "quiero ver qué cambió y poder volver atrás" sobre varias tablas a la vez —legajos…
- `postgres-min-max-no-existe-para-uuid` — **Postgres — MIN()/MAX() no existen para uuid y rompen la función en TODA llamada**
  Al escribir cualquier función plpgsql o query que agregue una columna `uuid`, típicamente para "traer el id…
- `tarjeta-button-centrado-vertical` — **Tarjeta hecha con <button> — el navegador le centra el contenido y la desalinea**
  Cuando en una fila o grilla de tarjetas **una sola** aparece corrida hacia abajo respecto de las otras, y el…
- `fondo-full-bleed-recorte-y-mascara` — **Fondo full-bleed — dónde recorta `object-cover` y sobre qué caja se miden los % de la máscara**
  Al montar una sección con imagen de fondo a todo el ancho: un hero, un slide de diseño, un banner. Dos cosas…
- `supabase-max-rows-limit` — **Supabase — Max Rows silencioso trunca queries sin paginar**
  Al escribir o revisar cualquier `select()` de Supabase que traiga una tabla que puede crecer sin límite…
- `scroll-driven-animations-no-confiar` — **No colgar un efecto central de animation-timeline scroll()**
  Cuando el efecto de scroll (hero que se atraviesa, parallax, barra de progreso) **es** la identidad de la…
- `precios-erp-impuesto-incluido` — **Bug silencioso — lista de precios de un ERP que ya incluye IVA (doble impuesto)**
  Siempre que un proyecto de e-commerce **importe precios desde un sistema externo** (ERP, mayorista, planilla…
- `recurrencia-eventos-dia-semana` — **Recurrencia de eventos anclada a día de semana real (no a created_at)**
  Al generar ocurrencias de un evento/taller recurrente (semanal, quincenal, mensual, etc.) a partir de una…
- `editor-de-lista-en-un-form-server-action` — **Editor de lista dentro de un form con server action**
  Cuando un formulario tiene que editar una **lista de filas** (un programa de horarios, ítems de un…
- `env-var-parity-branch-deploy` — **Paridad de env vars al mergear una rama a producción**
  Antes de mergear/pushear a `main` (o al proyecto de Vercel que sirve producción) una rama que estuvo en…
- `react-valor-anterior-estado-no-ref` — **Valor anterior en React — estado, no ref, si se lee en el render**
  Cuando el render necesita comparar **el valor actual contra el anterior**: un carrusel que decide si un item…
- `unique-key-incompleta-pisa-filas` — **Clave única incompleta que pisa filas en cada upsert**
  Cuando una tabla "pierde" datos después de cada sync/importación y no hay ningún error en los logs.…
- `email-boton-fondo-blanco-mobile` — **Botón de mail con fondo blanco en el celular — bgcolor y color-scheme**
  Un mail HTML se ve bien en escritorio pero en el celular un botón (o cualquier bloque de color) aparece con…
- `z-index-negativo-fondo-body` — **El z-index negativo desaparece detrás del fondo del body**
  Cuando una imagen o capa de fondo puesta con `z-index: -1` / `-z-10` **no se ve**, y el sitio tiene un…
- `claude-md-symlink-agents-sobreescrito` — **CLAUDE.md como symlink a AGENTS.md — la doc del proyecto se borra sola**
  Al documentar cualquier proyecto que tenga `AGENTS.md` generado por `brain-agents-inject` Cuando aparece un…
- `grid-hairlines-responsive-nth-child` — **Grillas con hairlines responsivas — reaplicar bordes en cada media query**
  Diseños "caged" / brutalistas donde las líneas de 1px entre celdas se dibujan con `border-top` /…
- `contenido-dual-visibilidad` — **Contenido dual público/comunidad con columna visibilidad**
  Cuando un sitio tiene usuarios con diferentes niveles de acceso (público, registrado, miembro) y querés…
- `supabase-rls-funcion-policy-grant-execute` — **Bug silencioso — función en policy RLS necesita GRANT EXECUTE al rol que consulta**
  Cuando en Supabase/Postgres una tabla con RLS **devuelve 401 en TODA lectura** para un rol (típicamente…
- `descuentos-apilados-precio-efectivo` — **Descuentos apilados — un solo helper de "precio efectivo", nunca el precio crudo**
  Cuando a un catálogo que ya tiene **un descuento global** (por medio de pago: transferencia, efectivo) se le…
- `webhook-idempotencia-orden-registro` — **Webhooks de pago — registrar el evento DESPUÉS de aplicarlo, no antes**
  Al escribir el webhook de cualquier pasarela (Mercado Pago, Stripe, MODO) que tenga una tabla de eventos con…
- `supabase-verificar-redirect-urls` — **Verificar las Redirect URLs de Supabase Auth sin mandar mails**
  Cambiaste el Site URL / Redirect URLs de Supabase y querés confirmar que quedó bien, sin registrar un usuario…
- `overflow-clip-vs-hidden-scroll-horizontal` — **Scroll horizontal en mobile — overflow-x-clip vs overflow-hidden**
  Cuando en el teléfono **toda la página se mueve para los costados** y no se encuentra el culpable, o cuando…
- `supabase-conexion-cli` — **Conectar Supabase CLI con PAT**
  El PAT de Supabase es **por cuenta**, no por proyecto. Un solo token sirve para todos los proyectos de la…
- `credencial-solo-con-pago-confirmado` — **La credencial se emite con el pago confirmado, no al iniciar el checkout**
  Cuando el sistema entrega algo de valor al comprador —QR de entrada, código de acceso, licencia, link de…
- `mercadopago-webhooks-notification-url` — **Mercado Pago — el webhook ya funciona sin configurar el panel**
  Cuando una integración de Checkout Pro parece "no tener webhook" porque nunca se configuró **Tus…
- `supabase-mcp-multiproyecto` — **Supabase MCP Multiproyecto**
  Siempre. Esta skill es un guard automático: cada vez que se use cualquier herramienta MCP de Supabase, se…
- `astro-partial-htmx-doctype` — **Fragmentos de htmx en Astro — sin `export const partial = true` viene con doctype**
  Al crear cualquier ruta de Astro cuyo destino sea que htmx (o un `fetch` + `innerHTML`) inserte el resultado…
- `logo-png-padding-alpha` — **Logo PNG que se ve chico — padding alfa dentro del archivo**
  Cuando ponés un logo que mandó un diseñador (PNG/WebP con transparencia) en un navbar, footer o card, lo…
- `filtro-sobre-la-misma-tabla-no-dos-secciones` — **Cuando el cliente pide "dos secciones", casi siempre es un filtro sobre la misma tabla**
  El cliente pide separar el contenido en dos: "retiros" y "ceremonias", "productos" y "servicios", "cursos" y…
- `regla-de-negocio-duplicada-en-n-lugares` — **La regla de negocio copiada a mano en N lugares, cada uno filtrando distinto**
  Cuando la misma pregunta de negocio —"¿esta fila cuenta?"— se responde en varios lugares a la vez: un…
- `vercel-ls-crea-proyecto-fantasma` — **`vercel ls` en un directorio sin linkear crea un proyecto fantasma y lo conecta a GitHub**
  Antes de correr **cualquier** comando de la CLI de Vercel en un repo que todavía no tiene…
- `aspect-ratio-cabe-en-viewport` — **Video 16:9 que entre en pantalla — capear ancho, no alto, y usar svh**
  Un player, hero o cualquier caja con relación de aspecto fija que tiene que entrar completa en el primer…
- `backdrop-filter-fixed-menu-clipped` — **backdrop-filter (o filter) en el header confina los hijos position:fixed a su propia caja**
  Cuando un menú mobile (burger menu / overlay `position: fixed; inset: 0`) reportado como "no despliega bien"…
- `sharp-vercel-pnpm-tracing` — **sharp en Vercel con pnpm — binarios nativos que no llegan al bundle**
  Cuando una ruta API de Next.js que usa `sharp` funciona en local pero en Vercel tira `ERR_DLOPEN_FAILED`…
- `astro-checkorigin-content-type` — **Astro checkOrigin — solo bloquea POSTs con content-type de formulario**
  Antes de escribir un endpoint en Astro SSR que reciba POSTs de **terceros** (webhooks de pasarelas, callbacks…
- `astro-dev-logger-json-agente-workerd` — **Astro 7 + Cloudflare — 500 en todas las rutas cuando el dev server lo corre un agente**
  Levantás `pnpm dev` desde Claude Code (o cualquier agente) en un proyecto **Astro 7 + `@astrojs/cloudflare`**…
- `supabase-ssr-login-deadlock` — **Bug silencioso — login colgado en "Cargando..." con @supabase/ssr + embed ambiguo**
  Dos bugs de admin Next.js + Supabase que aparecieron juntos en Pampa Estudio: 1. El botón de login queda en…
- `hono-set-signed-cookie-async` — **Hono setSignedCookie async sin await rompe cookies silenciosamente**
  Cuando uses `setSignedCookie` de Hono para auth con cookies firmadas y el login parezca funcionar (redirige)…
- `datetime-local-utc-bug` — **Bug silencioso de datetime-local con timestamps UTC**
  Siempre que un form tenga `<input type="datetime-local">` cuyo valor se carga desde un timestamp guardado en…
- `postgres-on-conflict-debe-matchear-constraint-real` — **ON CONFLICT en Postgres debe matchear una constraint real, o falla siempre**
  Al escribir o revisar funciones `plpgsql`/RPCs de Supabase que hacen `INSERT ... ON CONFLICT (cols) DO…
- `xlsx-import-grillas-empresariales` — **Importar planillas Excel/Sheets empresariales (grillas sucias) a Supabase**
  Al migrar datos desde Excel/Google Sheets "de uso real" de una empresa (no datasets limpios): encabezados que…
- `css-hover-dropdown-gap` — **Dropdown por :hover con gap visual se cierra antes de poder hacer click**
  Cuando un menú desplegable de navbar (categorías, "más opciones", etc.) se abre con `:hover` puro (sin JS) y…
- `flexbox-overflow-hidden-colapso` — **Flex item con overflow-hidden se aplasta a 0px en contenedores con scroll**
  Cuando un elemento "desaparece" dentro de un panel que es `flex flex-col` con `max-h-*` + `overflow-y-auto`…
- `mercadopago-checkout-descuentos` — **Mercado Pago Checkout Pro — descuentos por línea sin ítems negativos**
  Cuando un checkout con Mercado Pago (Checkout Pro / preferences) tiene descuentos (por volumen, por código…
- `zustand-persist-partialize` — **Zustand persist — partialize obligatorio para no persistir estado de UI**
  Siempre que un store de Zustand use el middleware `persist` y mezcle datos (items del carrito, preferencias)…
- `favicon-quitar-data-uri` — **Sacar el favicon no alcanza con borrar el archivo — hace falta href=\"data:,\**
  Cuando el cliente pide **no tener icono en la pestaña**, o cuando aparece un icono genérico/ajeno en alguna…
- `supabase-or-filter-escaping` — **Escapar input de usuario en .or() de Supabase (PostgREST)**
  Siempre que se interpole texto de búsqueda del usuario dentro de `.or()` de supabase-js (ej.…
- `lenis-smooth-scroll` — **Lenis smooth scroll — bugs silenciosos con drawers y overlays**
  Cuando un proyecto usa Lenis para smooth scroll y hay drawers, modales o cualquier contenedor con…

### Traídas por enlace

Estas no coinciden con el stack por tags, pero las skills de arriba las citan. Suelen ser el patrón general detrás del caso concreto.

- `cloudflare-d1-migrations` — **Cloudflare D1 — Migraciones y patrones SQLite**
  Cualquier proyecto con Cloudflare D1 (SQLite) que necesite migraciones de schema, especialmente cambios que…
  _citada por `cloudflare-wrangler-deploy`_
- `panel-admin-fetch-sin-res-ok` — **El panel que ignora `res.ok` convierte un error del backend en "el botón no hace nada**
  Al escribir o revisar cualquier panel de administración con `fetch` a mano (sin React Query / SWR), y sobre…
  _citada por `soft-delete-filtro-incompleto`_
