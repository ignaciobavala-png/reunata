# Migraciones — Reunata Web

8 migraciones SQL en `supabase/migrations/`. Ejecutar en orden con `supabase db push`.

---

## `20260418000001_schema_inicial.sql`

**Propósito:** Schema base del proyecto.

**Crea:**
- `profiles` — extensión de auth.users con rol, aprobación, datos fiscales
- `productos` — catálogo desde Gesu (10 listas de precio)
- `producto_fotos` — fotos por producto
- `pedidos` — 8 estados, total USD
- `pedido_items` — líneas de pedido con precio snapshot
- `comprobantes` — archivos de pago subidos
- `carrusel` — (no utilizado actualmente)
- `contenido` — CMS clave/valor (no utilizado actualmente)
- `configuracion` — banco, parámetros
- `sync_log` — historial de sincronización

**Triggers:**
- `handle_new_user()` — crea perfil automáticamente al registrarse
- `set_updated_at()` — actualiza timestamp en updates

---

## `20260418000002_rls.sql`

**Propósito:** Habilita RLS en todas las tablas y define políticas de acceso.

**Crea funciones helper:**
- `get_rol()` — obtiene el rol del usuario autenticado
- `cliente_aprobado()` — verifica si el cliente está aprobado

**Políticas por tabla:**
- master: acceso total
- empleado/comisionista: acceso a datos de trabajo
- cliente: solo datos propios
- carrusel/contenido: lectura pública
- configuracion/sync_log: solo master

---

## `20260418000003_roles_y_canales.sql`

**Propósito:** Expande el sistema de roles y agrega canales de venta.

**Cambios:**
- Crea `canales` (consumidor_final, distribuidor, local, mercha)
- Crea `producto_canales` (junction)
- Expande CHECK de `profiles.rol` de 3 a 7 valores
- Agrega `canal_id`, `comisionista_id` a `pedidos`
- Agrega columna `descuento` a `pedido_items`
- Reescribe todas las políticas RLS existentes
- Crea helpers `es_interno()`, `es_cliente()`

---

## `20260418000004_storage_multimedia.sql`

**Propósito:** Crea el bucket Storage para fotos.

**Crea:**
- Bucket `multimedia` (público, 10MB max, tipos: jpeg/png/webp/avif)
- Políticas: lectura pública, escritura solo master

---
---

## `20260418000005_whatsapp_config.sql`

**Propósito:** Agrega clave de WhatsApp a la tabla `configuracion`.

**Inserta:** `clave = 'whatsapp_ventas'`, `valor = ''`

---

## `20260419000001_medio_pago_completo.sql`

**Propósito:** Expande el CHECK de `medio_pago` en `pedidos` de 3 a 9 métodos reales.

**Valores:** mercadopago, transferencia_blanco, transferencia_cueva, efectivo, echeq_propio, echeq_tercero, cheque_fisico_propio, cheque_fisico_tercero, cuenta_corriente

---

## `20260419000002_producto_canales_inicial.sql`

**Propósito:** Asignación inicial: todos los productos activos × todos los canales.

**Operación:** `INSERT ... SELECT ... CROSS JOIN ... ON CONFLICT DO NOTHING`

---

## `20260430000001_postulaciones.sql`

**Propósito:** Agrega la funcionalidad "Trabaja con nosotros" con formularios de postulación.

**Crea:**
- Tabla `postulaciones` — postulaciones de fulltime y comisionista con estado pendiente/aprobado/rechazado
- Bucket Storage `cv` (público, 5MB max, PDF/DOC/DOCX/JPG/PNG)
- RLS: INSERT público, SELECT/UPDATE/DELETE solo internos (master, empleado, comisionista)
- Políticas Storage: lectura pública, inserción pública, eliminación solo internos

---

## `20260509000001_corporativos.sql`

**Propósito:** Agrega formulario de pedidos corporativos con productos personalizados.

**Crea:**
- Tabla `corporativos` — nombre, empresa, email, teléfono, cuit, ubicación, ocasión, cantidades, productos[], personalizar, fecha_limite, estado
- Bucket `corporativos` en Storage para archivos adjuntos
- RLS: INSERT público (service client), CRUD solo internos

---

## `20260509000002_banners.sql`

**Propósito:** Agrega tabla de banners promocionales.

**Crea:**
- Tabla `banners` — url, titulo, link_url, activo
- RLS: lectura pública, CRUD solo master/empleado

---

## `20260509181157_fix_fk_indexes_and_rls_initplan.sql`

**Propósito:** Hardening de base de datos.

**Cambios:**
- 14 índices en foreign keys
- RLS: migra de `auth.uid()` directo a subqueries para evitar InitPlan
- `search_path` explícito en funciones
- Revoca execute de `handle_new_user()` de anon

---

## `20260511000001_comunidad_fotos.sql`

**Propósito:** Agrega sección Comunidad / Instagram en homepage.

**Crea:**
- Tabla `comunidad_fotos` — id, url_instagram, thumbnail_url, caption, username, permalink, orden
- RLS: lectura pública, CRUD solo internos
- Bucket `multimedia` subpath `comunidad/`

---

## `20260511000002_alter_comunidad_fotos.sql`

**Propósito:** Ajusta columnas de comunidad_fotos.

**Cambios:**
- `url_instagram` nullable (ya no se almacenan URLs de Instagram)
- `thumbnail_url` pasa a NOT NULL

---

## `20260511000003_registro_mayorista.sql`

**Propósito:** Agrega columnas para registro de mayoristas con segmentación.

**Cambios:**
- Columnas nuevas en `profiles`: razon_social, direccion, localidad, sitio_web, puntos_venta, clientes_activos
- `handle_new_user()` ahora inserta también el `nombre` desde `raw_user_meta_data`

---

## `20260515000001_add_logo_url_to_corporativos` (MCP)

**Propósito:** Agrega campo para subir logo de empresa en formulario de corporativos.

**Cambios:**
- Columna `logo_url text` en tabla `corporativos`
- El logo se sube al bucket `corporativos/logos/` vía el formulario público

---

## `20260515000002_add_foto_url_to_categorias_home` (MCP)

**Propósito:** Permite definir una foto de portada manual por categoría en el panel multimedia.

**Cambios:**
- Columna `foto_url text` en tabla `categorias_home`
- Si está seteada, el `CategoryGallery` la usa como portada; sino usa la primera foto de los productos asociados

---

## `20260526000002_productos_es_novedad.sql`

**Propósito:** Marca productos como "novedad" para mostrarlos en sección destacada.

**Cambios:**
- Columna `es_novedad boolean NOT NULL DEFAULT false` en tabla `productos`

---

## `20260526000003_pedidos_mp_fields.sql`

**Propósito:** Campos para vincular pedidos con Mercado Pago.

**Cambios:**
- `mp_preference_id text` en `pedidos` — ID de preferencia creada en MP
- `mp_payment_id text` en `pedidos` — ID del pago confirmado vía webhook IPN

---

## `20260528000001_producto_canales_multiplo.sql`

**Propósito:** Permite configurar múltiplo de cantidad mínima por producto por canal de venta.

**Cambios:**
- `multiplo integer NOT NULL DEFAULT 1` en `producto_canales`
- DEFAULT 1 = sin restricción. Retrocompatible con todos los registros existentes

---

## `20260603000001_pedidos_guest_checkout.sql`

**Propósito:** Habilita compras de invitados (sin cuenta registrada).

**Cambios:**
- `cliente_id` en `pedidos` pasa a nullable
- Columnas nuevas: `guest_nombre text`, `guest_email text`, `guest_telefono text`
- Cuando `cliente_id IS NULL`, los datos del comprador se leen desde los campos `guest_*`

---

## `20260603000002_canal_fabricantes.sql`

**Propósito:** Crea canal de venta para fabricantes con acceso por bulto.

**Inserta en `canales`:** slug=`fabricantes`, Lista1, `ver_por_bulto=true`, `acceso_precompra=true`

**Nota:** No tiene rol correspondiente en `profiles`. Solo asignación manual desde el panel admin.

---

## `20260603000003_configuracion_tipo_cambio_usd.sql`

**Propósito:** Seed del valor de tipo de cambio USD → ARS en `configuracion`.

**Inserta:** `clave='tipo_cambio_usd', valor='1'` (ON CONFLICT DO NOTHING). El admin lo actualiza desde el panel.

---

## `20260603000004_productos_stock_visible.sql`

**Propósito:** Almacena el stock sincronizado desde Gesu para validación en checkout.

**Cambios:**
- `stock_visible integer` nullable en `productos`
- NULL = sin control de stock (no bloquea checkout). Solo bloquea si hay valor explícito

---

## `20260603000005_productos_mostrar_stock.sql`

**Propósito:** Controla si el stock se muestra públicamente en la ficha del producto.

**Cambios:**
- `mostrar_stock boolean NOT NULL DEFAULT false` en `productos`

---

## `20260605000001_eliminar_canal_publico.sql`

**Propósito:** Elimina el canal "publico" que nunca se usó en tienda ni catálogo.

**Operaciones (en orden):**
1. Elimina filas de `producto_canales` vinculadas al canal `publico`
2. Desasocia cualquier perfil que tuviera ese `canal_id` (limpieza preventiva)
3. Elimina el registro de `canales` con slug=`publico`
