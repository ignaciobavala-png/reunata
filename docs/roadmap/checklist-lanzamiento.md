# Checklist de lanzamiento — Reunata Web

> Documento vivo. Tachar cada ítem al completarlo.
> Última actualización: 2026-06-08 — revisado contra el código real, muchos bugs de la auditoría ya estaban corregidos.

---

## 🔴 Bloqueante absoluto — no se puede lanzar sin esto

### Infraestructura

- [ ] **Dominio propio** configurado en Vercel
- [ ] **Verificación Google Search Console** completada (ver `docs/google-oauth-dominio.md`)
- [ ] **Variables de entorno en Vercel** (entorno Production):
  - [ ] `MP_ACCESS_TOKEN` — token real de MercadoPago (no el `TEST-...`)
  - [ ] `NEXT_PUBLIC_APP_URL` — dominio de producción (ej: `https://reunata.com`)
  - [ ] `MP_WEBHOOK_SECRET` — secret del webhook configurado en el dashboard de MP
- [ ] **Email de confirmación Supabase** — verificar que el template apunte al dominio de producción, no a localhost ni al dominio de Vercel

### Bugs críticos de seguridad

> Documentados en detalle en `docs/auditoria.md`.
> ✅ = ya corregido en el código (verificado 2026-06-08)

- ✅ **#1 — Webhook MP sin verificación de firma**
  `verificarFirma()` con HMAC-SHA256 ya implementada en `src/app/api/mp/webhook/route.ts`.

- ✅ **#5 — Webhook no lee el body JSON de MP**
  `req.clone().json()` ya lee el body; `body.data?.id` extrae el payment ID correctamente.

- ✅ **#3 — Mayoristas no aprobados pueden crear pedidos**
  `crearPedidoBorrador` verifica `profiles.aprobado` y lanza error si es `false`.

- ✅ **#2 — Guest checkout ignora múltiplos de cantidad**
  Validación de múltiplos fuera del `if (user)` desde línea 49 de `checkout.ts`.

---

## 🟠 Importante — resolver antes o en la primera semana

### Funcionalidades faltantes

- [ ] **Google OAuth funcional**
  El botón existe pero `GoogleLoginButton` no está conectado a `signInWithOAuth`.
  Pasos:
  1. Habilitar identity linking en Supabase (Settings → Auth → Merge accounts)
  2. Conectar el botón con `supabase.auth.signInWithOAuth({ provider: 'google' })`
  3. Si el perfil no tiene razón social/CUIT → redirigir a formulario de completar datos

- ✅ **Lupa de búsqueda funcional**
  Header redirige a `/tienda?q=`, query ILIKE sobre `titulo` y `codigo_interno`, grilla de resultados con conteo.

### API de envíos — Enviopack

> Documentado en detalle en `docs/integraciones/enviopack.md`.

**Fase 1 (cotización) — ✅ implementada y lista para producción**
- ✅ `ENVIOPACK_ACCESS_TOKEN` en Vercel (variable ya configurada)
- ✅ Dimensiones por producto (`peso`, `alto`, `ancho`, `largo`, `enviar_solo` en `productos`)
- ✅ Cotización en carrito (`/api/envio/cotizar` + `EnvioCotizador`)
- ✅ Re-verificación server-side del costo al hacer checkout
- ✅ Costo de envío como ítem separado en MercadoPago

**Fase 1 — gap pendiente (pequeño, sin urgencia de bloqueo):**
- [ ] Migración: agregar `envio_codigo_postal` + `envio_provincia` a tabla `pedidos`
- [ ] Guardar esos campos en `actions/checkout.ts` al crear el pedido
  *(sin esto, el dato de destino se pierde una vez pagado — afecta gestión manual)*

**Fase 2 (etiquetas/tracking) — post-lanzamiento**
- [ ] Formulario de dirección completa en carrito (calle, número, localidad)
- [ ] `POST /api/enviopack/envios` desde webhook MP al detectar `status=approved`
- [ ] Guardar `enviopack_envio_id` + `nro_seguimiento` en pedido
- [ ] (Opcional) email al cliente con número de seguimiento

### Bugs altos

> Documentados en `docs/auditoria.md`.
> ✅ = ya corregido en el código (verificado 2026-06-08)

- ✅ **#4 / #16** — Checkout usa `stock_visible ?? stock` en `iniciarCheckoutMP()` y `crearPedidoBorrador`.

- ✅ **#9** — `crearPedidoBorrador` valida stock y múltiplos (líneas 51–74 de `pedidos.ts`).

- ✅ **#13** — Auth callback usa `.upsert()` — corregido en esta sesión (`auth/callback/route.ts`).

- ✅ **#7** — Pedidos abandonados: columna `expira_en` en `pedidos` + cron diario a las 3am en `/api/pedidos/limpiar` que cancela los vencidos. El checkout setea `expira_en = NOW() + 24h` al crear cada pedido.

---

## 🟡 Backlog — primera semana post-lanzamiento

### Bugs

- ✅ **#8** — Precios en OfferDrawer ahora usan `formatPrecio()` — corregido en esta sesión.
- ✅ **#14** — `AddToCartButton` respeta cantidad mínima con `Math.max(multiplo, nueva)`.
- ✅ **#15** — Webhook idempotente: `fecha_pago` solo se escribe si el pedido no estaba ya confirmado.
- [ ] **#6** — `handleMenos` en carrito: edge case con cantidad no-múltiplo (solo afecta estado inconsistente, flujo normal no lo genera).
- [ ] **#11** — `resolverCanalTienda` escribe a DB en cada page load (mover a middleware o cachear en cookie).
- [ ] **#12** — RLS `producto_fotos` permite leer fotos de productos inactivos.

### Features

- [ ] Newsletter funcional (tabla `suscriptores` + server action + exportar CSV desde admin)
- [ ] Formulario de opiniones en `/contacto`
- [ ] Páginas estáticas editables vía tabla `contenido` (Nosotros, FAQ, Términos, Políticas)

---

## 🟢 Mejoras — cuando haya bandwidth

- [ ] **#17** — HeroCarousel: agregar `sandbox` a iframes de YouTube/Vimeo
- [ ] **#18** — PromoTicker: validar velocidad mínima de 20s en el slider
- [ ] **#19** — CategoryGallery: paginación o lazy load para 50+ categorías
- [ ] **#20** — FloatingActions: filtrar ofertas por canal en la query, no en el cliente
- [ ] **#21** — `cartStore.clear()` no resetea `ownerId`
- [ ] Filtros en tienda (auditar atributos en `productos`, posible tabla `atributos`)
- [ ] Más Elegidos: algoritmo automático + intervención manual
- [ ] Seguimiento de envíos para el cliente en `/pedidos`

---

## Notas de contexto

- **MercadoPago**: webhook con HMAC-SHA256, lectura del body JSON e idempotencia de `fecha_pago` ya están implementados. El único pendiente es configurar `MP_WEBHOOK_SECRET` y `MP_ACCESS_TOKEN` reales en Vercel.
- **Enviopack**: la integración completa (cotización + etiquetas) está documentada en `docs/enviopack.md`. Depende de la charla con Gastón para definir credenciales y peso/dimensiones.
- **Google OAuth**: el botón existe visualmente pero no está conectado a `signInWithOAuth`. Bloqueante para usuarios que quieran registrarse con Google.
- **Dominio**: hasta que no esté configurado, el redirect OAuth de Google apunta a una URL incorrecta.
