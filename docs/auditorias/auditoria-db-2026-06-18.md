# Auditoría de Base de Datos — 2026-06-18

**23 tablas · RLS habilitado en todas · 3 triggers activos**

Generada a partir de consulta directa a producción (Supabase). No se realizaron cambios.

---

## 🔴 Crítico — bloquea funcionalidad futura

### 1. `pedidos.expira_en` no existe en la DB
La migración `20260608000001_pedidos_expira_en.sql` está en el repo pero nunca se aplicó a producción. La columna no existe. El backlog #7 (vencimiento automático de pedidos) y el cron `/api/pedidos/limpiar` no pueden funcionar hasta que se aplique.

### 2. Canal `publico` sigue activo en DB
La migración `20260605000001_eliminar_canal_publico.sql` existe en el repo pero el canal sigue vivo (`id=5, activo=true`). El trigger `auto_asignar_producto_canales` itera sobre todos los canales `activo=true`, por lo que cada sync de Gesu inserta filas inútiles en `producto_canales` para el canal `publico`. Está contaminando silenciosamente esa tabla.

### 3. `pedidos.medio_pago` CHECK incompatible con `canales_config`
El CHECK constraint de `pedidos` usa nombres que no coinciden con los definidos en `canales_config`. Cuando la Fase B guarde pedidos con los nuevos métodos de pago, el INSERT fallará por violación de CHECK.

| En `pedidos` (CHECK actual) | En `canales_config` | Problema |
|---|---|---|
| `transferencia_cueva` | `transferencia_negro` | mismo concepto, distinto nombre |
| `mercadopago` | `mercado_pago` | mismo concepto, distinto nombre |
| `cheque_propio` / `cheque_tercero` | `echeq_al_dia` / `cheque_fisico_al_dia` / `echeq_propio` / `echeq_tercero` / `cheque_fisico_financiado` | reemplazados por nomenclatura nueva |
| `cuenta_corriente` | — | ausente en canales_config |

---

## 🟡 Inconsistencias / Legacy

### 4. Tabla `carrusel` — dead code
0 filas, RLS activo. Fue reemplazada por `hero_assets`. No se referencia en ningún componente del código. Es ruido en el esquema.

### 5. Columnas legacy en `canales`
`politica_pago` y `politica_descuentos` son `null` en todos los registros — fueron reemplazadas conceptualmente por `canales_config`. Las columnas `ver_por_bulto`, `ver_por_unidad` y `acceso_precompra` sí tienen datos y aún se usan en `resolverCanalTienda()`, por lo que quedan.

### 6. Políticas RLS redundantes en `producto_fotos`
Existen tres políticas simultáneas: `public_read_fotos` (SELECT a todos), `interno_cliente_read_fotos` (SELECT roles internos) y `master_all_fotos` (ALL). Como `public_read_fotos` ya permite SELECT a todos, `interno_cliente_read_fotos` es redundante. No causa errores pero agrega ruido en auditorías de seguridad.

### 7. `configuracion` vs `contenido` — misma estructura
Ambas son tablas key-value `(clave, valor, updated_at)`:
- `configuracion` (31 filas): diseño, tokens, URLs externas
- `contenido` (7 filas): textos de páginas provisorias

Están separadas por diseño y funcionan correctamente. A futuro podrían unificarse si escala, pero no es prioritario.

---

## 🟠 Índices faltantes

### 8. `pedidos.mp_preference_id` sin índice
El webhook de MP hace `SELECT ... WHERE mp_preference_id = $1`. Con bajo volumen no se nota, pero en producción es un full-scan sobre la tabla de pedidos.

### 9. `pedidos.mp_payment_id` sin índice
Mismo caso. Usado en la verificación del IPN de MercadoPago.

---

## 🟢 Lo que está correcto

- RLS habilitado en las 23 tablas sin excepción ✅
- Todas las FKs relevantes tienen índices explícitos ✅
- Cascade correcto: `pedido_items → pedidos` CASCADE, `producto_fotos → productos` CASCADE ✅
- `pedido_items.producto_id → productos` usa NO ACTION (correcto para historial de pedidos) ✅
- Trigger `auto_asignar_producto_canales`: lógica INSERT/UPDATE correcta ✅ (solo el scope del canal `publico` es el problema — ver punto 2)
- `canales_config`: FK con CASCADE, RLS bien configurada ✅

---

## Acciones pendientes (en orden de prioridad)

| # | Acción | Urgencia | Estado |
|---|--------|----------|--------|
| A | `expira_en` en `pedidos` | Alta — pre-lanzamiento | ✅ Aplicado 2026-06-18 |
| B | Eliminar canal `publico` + corregir trigger | Alta | ✅ Aplicado 2026-06-18 |
| C | Actualizar CHECK `pedidos.medio_pago` | Alta | ✅ Aplicado 2026-06-18 |
| D | Índices `mp_preference_id` y `mp_payment_id` | Media | ✅ Aplicado 2026-06-18 |
| E | Eliminar tabla `carrusel` | Baja | Pendiente |
| F | Eliminar columnas `politica_pago` / `politica_descuentos` de `canales` | Baja | Pendiente |

---

## Estado del esquema al momento de la auditoría

| Tabla | Filas | RLS | Notas |
|---|---|---|---|
| `profiles` | 6 | ✅ | |
| `productos` | 255 | ✅ | |
| `producto_fotos` | 40 | ✅ | 3 políticas SELECT (1 redundante) |
| `producto_canales` | ~1011 | ✅ | Filas de canal `publico` eliminadas 2026-06-18 |
| `pedidos` | 2 | ✅ | `expira_en` agregado, CHECK actualizado 2026-06-18 |
| `pedido_items` | 1 | ✅ | |
| `comprobantes` | 0 | ✅ | |
| `canales` | 5 | ✅ | Canal `publico` eliminado 2026-06-18 |
| `canales_config` | 0 | ✅ | Sin configurar aún |
| `categorias_home` | 14 | ✅ | |
| `ofertas` | 13 | ✅ | |
| `hero_assets` | 2 | ✅ | |
| `carrusel` | 0 | ✅ | Dead code |
| `banners` | 1 | ✅ | |
| `configuracion` | 31 | ✅ | |
| `contenido` | 7 | ✅ | |
| `comunidad_fotos` | 9 | ✅ | |
| `catalogos` | 0 | ✅ | |
| `corporativos` | 1 | ✅ | |
| `postulaciones` | 3 | ✅ | |
| `favoritos` | 5 | ✅ | |
| `newsletter_suscriptores` | 1 | ✅ | |
| `sync_log` | 38 | ✅ | |
