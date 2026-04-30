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
