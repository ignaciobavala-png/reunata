# Server Actions — Reunata Web

Todas en `src/app/actions/`. Usan `'use server'` y `createClient()` de `@/lib/supabase/server` (cliente SSR con cookies).

---

## `auth.ts`

### `login(formData: FormData)`
- **Lee:** `email`, `password` del FormData
- **Auth:** signInWithPassword de Supabase
- **DB:** `profiles` (select rol)
- **Redirect:** `/dashboard/admin` (internos) o `/dashboard/cliente` (clientes)
- **Error:** redirect a `/login?error=credenciales_invalidas`
- **Consumido por:** `src/app/login/page.tsx`

### `logout()`
- **Auth:** signOut de Supabase
- **Redirect:** `/login`
- **Consumido por:** `src/components/dashboard/Sidebar.tsx`

---

## `canales.ts`

### `toggleProductoCanal(productoId: number, canalId: number, activo: boolean)`
- **DB:** `producto_canales` (insert si activo=true, delete si activo=false)
- **Consumido por:** `CanalesClient.tsx`

### `asignarCanalMasivo(productoIds: number[], canalId: number, activo: boolean)`
- **DB:** `producto_canales` (upsert batch si activo=true, delete batch si activo=false)
- **Consumido por:** `CanalesClient.tsx`

---

## `clientes.ts`

### `aprobarCliente(clienteId: string, aprobado: boolean)`
- **DB:** `profiles` (update `aprobado`)
- **Consumido por:** `ClientesClient.tsx`

### `actualizarCanalCliente(clienteId: string, canalId: number | null)`
- **DB:** `profiles` (update `canal_id`)
- **Consumido por:** `ClientesClient.tsx`

---

## `configuracion.ts`

### `guardarConfiguracion(formData: FormData)`
- **Claves que guarda:** `banco_cbu`, `banco_alias`, `banco_nombre`, `banco_razon_social`, `banco_cuit`, `pedido_monto_minimo`, `pedido_dias_vencimiento`
- **DB:** `configuracion` (upsert por `clave`)
- **Consumido por:** `src/app/dashboard/admin/configuracion/page.tsx`

---

## `cuenta.ts`

### `actualizarPerfil(userId: string, formData: FormData)`
- **Campos:** `nombre`, `email`, `telefono`, `cuit_dni`, `condicion_fiscal`
- **DB:** `profiles` (update por `id`)
- **Consumido por:** `CuentaForm.tsx`

---

## `empleados.ts`

### `invitarEmpleado(formData: FormData)`
- **Lee:** `email`, `rol` (empleado|comisionista), `nombre`
- **Auth:** `supabase.auth.admin.inviteUserByEmail` (requiere service_role)
- **DB:** `profiles` (update rol, nombre tras invitación)
- **Validación:** email, rol y nombre requeridos
- **Consumido por:** `EmpleadosClient.tsx`

### `desactivarEmpleado(empleadoId: string)`
- **DB:** `profiles` (update `activo = false`)
- **Consumido por:** `EmpleadosClient.tsx`

---

## `pedidos.ts`

### `crearPedidoBorrador(lineas: LineaPedido[])` → `Promise<string>`
- **Input:** `LineaPedido { productoId, cantidad, precioUnit }`
- **DB:** `pedidos` (insert, estado `pendiente_pago`), `pedido_items` (insert batch)
- **Calcula:** `total_usd = sum(precioUnit * cantidad)`
- **Auth:** verifica `user` autenticado
- **Consumido por:** `CartDrawer.tsx`

### `subirComprobante(pedidoId: string, path: string)`
- **DB:** `comprobantes` (insert url), `pedidos` (update estado → `comprobante_subido`)
- **Consumido por:** `ComprobanteUploader.tsx`

### `confirmarPago(pedidoId: string, medioPago: string, referencia?: string)`
- **DB:** `pedidos` (update estado → `pago_confirmado`, medio_pago, referencia, pago_confirmado_por, fecha_pago)
- **Consumido por:** Panel admin de pedidos

### `actualizarEstadoPedido(pedidoId: string, estado: string)`
- **DB:** `pedidos` (update estado)
- **Transiciones válidas:** en_preparacion, enviado, entregado, cancelado
- **Consumido por:** Panel admin de pedidos
