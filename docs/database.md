# Base de Datos — Reunata Web

Esquema PostgreSQL en Supabase. 16 tablas, RLS completo.

---

## Tablas

### `profiles`
Extiende `auth.users`. Un registro por usuario.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | FK → `auth.users.id` |
| `nombre` | text | |
| `email` | text | |
| `telefono` | text | WhatsApp |
| `cuit_dni` | text | |
| `razon_social` | text | Solo mayorista |
| `direccion` | text | Solo mayorista |
| `localidad` | text | Solo mayorista |
| `sitio_web` | text | Solo mayorista |
| `puntos_venta` | integer | Solo mayorista |
| `clientes_activos` | integer | Solo mayorista |
| `condicion_fiscal` | text | |
| `rol` | text | CHECK: master, empleado, comisionista, consumidor_final, distribuidor, local, mercha |
| `aprobado` | boolean | null = pendiente, true = aprobado |
| `activo` | boolean | Para empleados/comisionistas |
| `canal_id` | integer | FK → `canales.id` |
| `bonificacion` | numeric | Descuento especial |
| `created_at` | timestamptz | default now() |

### `productos`
Catálogo sincronizado desde Gesu.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `codigo_interno` | text UNIQUE | Identificador en Gesu |
| `codigo_barras` | text | |
| `tipo` | text | |
| `titulo` | text | |
| `categoria` | text | |
| `sub_categoria` | text | |
| `marca` | text | |
| `proveedor` | text | |
| `stock` | integer | |
| `stock_minimo` | integer | |
| `moneda` | text | default 'u$s' |
| `precio_compra` | numeric | |
| `precio_lista1..5` | numeric | Precios según canal |
| `iva` | numeric | |
| `descripcion` | text | |
| `palabras_clave` | text | |
| `activo` | boolean | default true |
| `ultima_sync` | timestamptz | |

### `producto_fotos`
Fotos por producto, almacenadas en bucket `multimedia`.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `producto_id` | integer FK → `productos.id` | |
| `url` | text | Ruta en Storage |
| `orden` | integer | |
| `destacada` | boolean | Para slider "Más elegidos" en home |

### `producto_canales`
Junction: qué productos son visibles en cada canal.

| Columna | Tipo |
|---|---|
| `producto_id` | integer FK → `productos.id` |
| `canal_id` | integer FK → `canales.id` |

**Trigger `trigger_auto_asignar_canales`:** al insertar un producto nuevo con `activo=true`, o al reactivar uno existente, se insertan automáticamente filas en `producto_canales` para todos los canales activos. Evita que productos nuevos del sync queden invisibles para los clientes.

### `canales`
Canales de venta con lista de precios.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `slug` | text UNIQUE | consumidor_final, distribuidor, local, mercha |
| `nombre` | text | |
| `lista_precios` | integer | 1..5, mapea a `precio_listaN` en productos |
| `descripcion` | text | |

### `categorias_home`
Macrocategorías para el bento de portada.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `nombre` | text | |
| `descripcion` | text | |
| `href` | text | Link de la categoría |
| `activo` | boolean | default true |
| `orden` | integer | |
| `categoria_keys` | text[] | Categorías Gesu agrupadas |
| `foto_url` | text | Foto de portada manual (opcional); fallback a productos |

### `pedidos`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `cliente_id` | uuid FK → `profiles.id` | |
| `estado` | text | CHECK: borrador, pendiente_pago, comprobante_subido, pago_confirmado, en_preparacion, enviado, entregado, cancelado |
| `total_usd` | numeric | |
| `medio_pago` | text | CHECK: mercadopago, transferencia_blanco, transferencia_cueva, efectivo, echeq_propio, echeq_tercero, cheque_fisico_propio, cheque_fisico_tercero, cuenta_corriente |
| `referencia_pago` | text | |
| `pago_confirmado_por` | uuid | FK → `profiles.id` |
| `fecha_pago` | timestamptz | |
| `canal_id` | integer | FK → `canales.id` |
| `comisionista_id` | uuid | FK → `profiles.id` |
| `notas` | text | |
| `created_at` | timestamptz | |

### `pedido_items`
Líneas de cada pedido con snapshot del precio.

| Columna | Tipo |
|---|---|
| `id` | serial PK |
| `pedido_id` | uuid FK → `pedidos.id` |
| `producto_id` | integer FK → `productos.id` |
| `cantidad` | integer |
| `precio_unit` | numeric |

### `comprobantes`
Archivos de pago subidos por el cliente.

| Columna | Tipo |
|---|---|
| `id` | serial PK |
| `pedido_id` | uuid FK → `pedidos.id` |
| `url` | text |
| `created_at` | timestamptz |

### `configuracion`
Clave/valor para parámetros del sistema.

| Columna | Tipo |
|---|---|
| `clave` | text PK |
| `valor` | text |

Claves del sistema: `banco_cbu`, `banco_alias`, `banco_nombre`, `banco_razon_social`, `banco_cuit`, `pedido_monto_minimo`, `pedido_dias_vencimiento`, `whatsapp_ventas`

Claves de diseño (gestionadas desde Multimedia > Diseño): `diseno_acero_brillo`, `diseno_acero_claro`, `diseno_acero`, `diseno_acero_oscuro`, `diseno_granito_claro`, `diseno_granito`, `diseno_granito_oscuro`, `diseno_background`

### `sync_log`
Historial de sincronizaciones con Gesu.

| Columna | Tipo |
|---|---|
| `id` | serial PK |
| `tipo` | text |
| `estado` | text |
| `registros` | integer |
| `mensaje` | text |
| `created_at` | timestamptz |

### `hero_assets`
Assets del carrusel Hero en homepage. Se gestionan desde Multimedia > Hero.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `tipo` | text | CHECK: imagen, video |
| `url` | text | Ruta en Storage |
| `orden` | integer | |
| `activo` | boolean | default true |
| `etiqueta` | text | Texto pequeño superior |
| `titulo` | text | Título grande |
| `subtitulo` | text | |
| `boton_texto` | text | Texto del CTA |
| `boton_url` | text | Link del CTA |
| `created_at` | timestamptz | default now() |

### `ofertas`
Ofertas y Hot Sale, visibles en FloatingActions drawer. FK → productos.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `canal` | text | CHECK: ofertas, hotsale |
| `producto_id` | integer FK → `productos.id` | |
| `precio_oferta` | numeric | |
| `descuento_porcentaje` | integer | |
| `orden` | integer | default 0 |
| `activo` | boolean | default true |
| `created_at` | timestamptz | |

### `contenido`
Páginas estáticas con contenido editable (Nosotros, FAQ, Términos, etc.).

| Columna | Tipo |
|---|---|
| `clave` | text PK |
| `valor` | text |
| `updated_at` | timestamptz |

### `postulaciones`
Postulaciones de "Trabaja con nosotros". Formulario público, solo internos gestionan.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | default gen_random_uuid() |
| `tipo` | text | CHECK: fulltime, comisionista, proveedor |
| `nombre` | text | NOT NULL |
| `apellido` | text | NOT NULL |
| `email` | text | NOT NULL |
| `direccion` | text | NOT NULL |
| `cv_url` | text | Solo fulltime. URL pública del bucket `cv` |
| `movilidad_propia` | boolean | Solo comisionista |
| `zonas` | text | Solo comisionista |
| `otras_marcas` | text | Solo comisionista |
| `cargo` | text | Solo proveedor |
| `empresa` | text | Solo proveedor |
| `cuit` | text | Solo proveedor |
| `pagina_web` | text | Solo proveedor |
| `productos_servicios` | text | Solo proveedor |
| `otras_empresas_provee` | text | Solo proveedor |
| `estado` | text | CHECK: pendiente, aprobado, rechazado. Default: pendiente |
| `created_at` | timestamptz | default now() |

### `corporativos`
Solicitudes de productos personalizados / regalos corporativos desde el formulario público `/corporativos`.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `nombre` | text | |
| `empresa` | text | |
| `email` | text | |
| `telefono` | text | |
| `cuit` | text | |
| `ubicacion` | text | |
| `ocasion` | text | |
| `cantidades` | integer | |
| `productos` | text[] | Multi-select |
| `personalizar` | text | Sí / No |
| `fecha_limite` | date | |
| `logo_url` | text | Ruta en bucket `corporativos/logos/` (opcional) |
| `estado` | text | CHECK: pendiente, aprobado, rechazado. Default: pendiente |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

## Row Level Security

Resumen de políticas por tabla:

| Tabla | Política general |
|---|---|
| `profiles` | master = todo. empleado/comisionista = solo work items. cliente = solo propio |
| `productos` | Lectura: autenticados. Escritura: master + service_role (sync) |
| `producto_fotos` | Lectura: cualquier autenticado. Escritura: master |
| `producto_canales` | Lectura: según canal del usuario. Escritura: master |
| `canales` | Lectura: autenticados. Escritura: master |
| `categorias_home` | Lectura: público. Escritura: master |
| `pedidos` | master = todos. cliente = propios. empleado = por asignar |
| `pedido_items` | Misma lógica que pedidos (hereda visibilidad) |
| `comprobantes` | master = todos. cliente = propios |
| `configuracion` | Lectura: autenticados. Escritura: master |
| `hero_assets` | Lectura: público. Escritura: master |
| `ofertas` | Lectura: público. Escritura: master, empleado |
| `contenido` | Lectura: público. Escritura: master |
| `postulaciones` | INSERT: público. SELECT/UPDATE/DELETE: master, empleado, comisionista |
| `sync_log` | Lectura: master. Inserción: service_role |
