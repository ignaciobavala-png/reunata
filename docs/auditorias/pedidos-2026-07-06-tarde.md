# Auditoría y fixes — Sección Pedidos, tarde (2026-07-06)

Continuación de `pedidos-2026-07-06.md` (mismo día, sesión de la tarde). Rama
de trabajo: `fixes` (mergeada a `main` por fast-forward, commit `4c0c3f2`).

Contraparte en lenguaje no técnico: `Resumen pedidos - para Gaston y tester.txt`
(Escritorio), sección "ACTUALIZACIÓN — TARDE DEL 6 DE JULIO".

Insumo: `Descargas/Tareas Programador.pdf` (reemplaza los .docx/.pdf previos de
Escritorio — es la versión más reciente del documento del tester a la fecha).

## 1. `crearPedidoBorrador` enmascaraba errores de validación en producción

**Síntoma reportado:** al intentar guardar un borrador, el tester veía "An
error occurred in the Server Components render. The specific message is
omitted in production builds... A digest property is included..." — el
mensaje genérico que Next.js sustituye cuando una Server Action hace `throw`
en build de producción, para no filtrar detalles sensibles al cliente. Esto
ocurre **aunque el caller tenga try/catch** — el enmascarado pasa antes de
que el valor llegue al cliente.

`crearPedidoBorrador` (`src/app/actions/pedidos.ts`) tiraba `throw new
Error(...)` para validaciones de negocio esperadas (mínimo de compra, stock
insuficiente, múltiplo de cantidad, cuenta no aprobada, ítems sin precio).

**Fix:** convertida a `Promise<{ ok: boolean; pedidoId?: string; error?:
string }>`, igual al patrón ya usado por `iniciarCheckoutTransferencia`
(`actions/checkout.ts`). Actualizados los dos callers (`CartDrawer.tsx`,
`CartClient.tsx`) para leer `result.ok`/`result.error` en vez de `catch`.

No cambia qué validaciones bloquean el pedido — solo hace que el motivo real
llegue al usuario en producción, no solo en dev.

## 2. Borradores invisibles en "Mis pedidos"

`(public)/pedidos/page.tsx:75` y `dashboard/cliente/page.tsx:38` tenían
`.neq('estado', 'borrador')` en la query — excluía esos pedidos antes de que
llegaran a la lógica de bandejas "En proceso"/"Finalizados". Un pedido recién
guardado sin confirmar quedaba invisible para su dueño. Se sacó el filtro en
ambos archivos; `ESTADOS_PEDIDO`/`ESTADOS_FINALIZADOS` ya clasifican
`borrador` correctamente como "en proceso".

## 3. Carrito mayorista — un solo paso para elegir forma de pago

Implementa el spec exacto de la pág. 4-5 del PDF ("Opción 1"). Antes:
toggle "Con IVA"/"Sin IVA" → recién después la lista de métodos filtrada por
esa elección (dos pasos, dos clics). Ahora: las dos columnas (Con IVA / Sin
IVA) se muestran siempre juntas, cada método con su total ya calculado vía
`totalMayoristaConMetodo(k)` (incluye descuento por volumen, autogestión y
el ajuste propio del método). Elegir un método fija `facturaIva` y
`metodoPago` en el mismo `onChange`.

Reordenado el panel: forma de pago → aviso línea de crédito → aviso mínimo de
compra/desc. por volumen → dirección de retiro → dirección de entrega (al
final — el tester pidió postergarla "porque todavía no tenemos novedades de
la API de envíos") → botón Confirmar.

**Bug encontrado y corregido en la misma sesión, antes del merge:** las dos
`<div>` de columna se renderizaban incondicionalmente en cuanto *alguna* de
las dos listas (`metodosConIva`/`metodosSinIva`) tenía longitud > 0 — un canal
con métodos solo de un tipo mostraba la columna del otro tipo vacía, con
título y sin contenido. Fix: cada columna ahora chequea su propia longitud;
si solo hay un tipo activo, se usa un layout de una sola columna
(`flex flex-col` en vez de `grid grid-cols-2`).

Verificado en navegador (`npx agent-browser`, cuenta `test-dist@reunata.com`):
ambas columnas pobladas, selección sincroniza `facturaIva`+`metodoPago`,
"Desc IVA" aparece/desaparece correctamente en el resumen al cambiar entre
Con IVA y Sin IVA, total se recalcula bien.

**No incluido en este cambio** (pendiente, ver PDF pág. 3-4): reestructurar
el bloque "Resumen del pedido" para mostrar "Total Bruto" y "Total IVA
incluido" en paralelo, sacando la línea "Desc IVA" actual. El PDF también
pide volver a calcular descuentos/mínimo de compra sobre el precio **con**
IVA incluido — esto contradice la decisión explícita de Ignacio del
2026-07-02 (Tanda 2 parte 2: referenciar Precio Bruto). Pendiente de
confirmar con él antes de tocarlo.

## 4. "Mis pedidos" del cliente — macro-columnas + sub-agrupación

`(public)/pedidos/page.tsx`: "En proceso"/"Finalizados" pasan de apiladas
(`flex flex-col`) a lado a lado (`grid grid-cols-1 lg:grid-cols-2`, `max-w-3xl`
→ `max-w-6xl`). Dentro de cada macro-columna, nueva función
`agruparPorEstado()` agrupa los pedidos por sub-estado siguiendo el orden de
`ESTADOS_PEDIDO` (pipeline), con un encabezado y contador por grupo (ej.
"Pendiente de pago (5)"). Antes era una lista plana ordenada solo por fecha,
mezclando sub-estados.

Motivado por una captura del tester con anotaciones a mano sobre la vista de
cliente (no el panel admin, que ya tenía este patrón de tabs desde la sesión
de la mañana — ver punto 6 de `pedidos-2026-07-06.md`).

## Auditoría del PDF completo — estado real vs pendiente

Se auditó cada ítem del PDF contra el código (agente Explore, sin cambios).
Resumen — implementado sin tocar nada hoy:

- Scroll restore ya es global (`LenisProvider.tsx`, montado en el layout raíz).
- Botón "Ver Todo" → `/tienda/mas-vendidos` ya correcto.
- Separación Color/Medida en variantes de producto (`ColorPicker.tsx`,
  detecta dígitos en el nombre de la variante).
- Financiación: plazo ya removido del formulario (commit `dc51dd7`, mañana).
- Historial de cambios de estado con usuario/fecha/hora: la nota de
  `pedidos-2026-07-06.md` ("falta la UI") está **desactualizada** — la UI
  existe y funciona (`dashboard/admin/pedidos/[id]/page.tsx:367-386`).

Pendiente real (no se tocó código, solo diagnóstico):

- Financiación: montos acumulables por mes + máximo acumulable — nada de
  esto existe en `actions/financiacion.ts` ni en el admin.
- `CanalConfigDrawer.tsx`: falta % editable para `echeq_al_dia`,
  `echeq_propio`, `echeq_tercero`, `cheque_fisico_al_dia`,
  `cheque_fisico_financiado`, `transferencia_negro` (hoy solo tienen
  toggle activo/inactivo).
- Seña: hardcodeada al 10%, solo para `medio_pago === 'efectivo'`
  (`EstadoActions.tsx:34-37`). Sin columna de % por canal en
  `canales_config`, sin comprobante de seña separado del comprobante final,
  sin reserva de stock explícita ligada a `sena_confirmada`. El PDF pide un
  % configurable por canal (ej. 50% para Merchandising) y el flujo completo
  descripto en `pedidos-2026-07-06.md` §5 sigue siendo solo el primer paso.
- Link "Vistos Recientemente" del menú Header apunta a `/historial`, un
  placeholder "Próximamente" — decidir si se oculta mientras tanto.

## Verificación

- `tsc --noEmit`, `eslint` (solo los 4 problemas preexistentes de
  `set-state-in-effect` no relacionados) y `next build` limpios antes del
  merge.
- Flujo de carrito mayorista verificado end-to-end en navegador real
  (`agent-browser`), sin crear pedidos de prueba en producción.
- Merge `fixes` → `main` por fast-forward (sin conflictos); rama `fixes`
  borrada tras el merge (solo local, sin remoto).
