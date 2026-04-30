# Server Actions — Reunata Web

Todas en `src/app/actions/`. Usan `'use server'`.

**Dos clientes según el caso:**
- `createServiceClient()` — acciones de admin (bypassea RLS, usa service role key). Canales, clientes, configuración, empleados.
- `createClient()` — acciones de cliente (respeta RLS y auth del usuario). Auth, cuenta, pedidos.

**Regla:** toda acción debe validar `error` de Supabase y hacer `throw` si falla.

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
- **Cliente:** `createServiceClient()`
- **DB:** `producto_canales` (insert si activo=true, delete si activo=false). Valida error con throw.
- **Consumido por:** `CanalesClient.tsx`

### `asignarCanalMasivo(productoIds: number[], canalId: number, activo: boolean)`
- **Cliente:** `createServiceClient()`
- **DB:** `producto_canales` (upsert batch si activo=true, delete batch si activo=false). Valida error con throw.
- **Consumido por:** `CanalesClient.tsx`

---

## `clientes.ts`

### `aprobarCliente(clienteId: string, aprobado: boolean)`
- **Cliente:** `createServiceClient()`
- **DB:** `profiles` (update `aprobado`). Valida error con throw.
- **Consumido por:** `ClientesClient.tsx`

### `actualizarCanalCliente(clienteId: string, canalId: number | null)`
- **Cliente:** `createServiceClient()`
- **DB:** `profiles` (update `canal_id`). Valida error con throw.
- **Consumido por:** `ClientesClient.tsx`

---

## `configuracion.ts`

### `guardarConfiguracion(formData: FormData)`
- **Cliente:** `createServiceClient()`
- **Claves que guarda:** `banco_cbu`, `banco_alias`, `banco_nombre`, `banco_razon_social`, `banco_cuit`, `pedido_monto_minimo`, `pedido_dias_vencimiento`
- **DB:** `configuracion` (upsert por `clave`). Valida error con throw.
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
- **Cliente:** `createServiceClient()` (requerido para `auth.admin`)
- **Lee:** `email`, `rol` (empleado|comisionista), `nombre`
- **Auth:** `supabase.auth.admin.inviteUserByEmail` (requiere service_role)
- **DB:** `profiles` (update rol, nombre tras invitación). Valida error con throw.
- **Validación:** email, rol y nombre requeridos
- **Consumido por:** `EmpleadosClient.tsx`

### `desactivarEmpleado(empleadoId: string)`
- **Cliente:** `createServiceClient()`
- **DB:** `profiles` (update `activo = false`). Valida error con throw.
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

---

## `postulaciones.ts`

### `crearPostulacion(formData: FormData)`
- **Cliente:** `createServiceClient()` (formulario público sin auth)
- **Lee:** `tipo` (fulltime|comisionista), `nombre`, `apellido`, `email`, `dni`, `direccion`, `nacionalidad`
- **Opcional fulltime:** `cv` (File → upload a Storage bucket `cv`, máx 5MB, MIME validado)
- **Opcional comisionista:** `movilidad_propia`, `zonas`, `otras_marcas`
- **Validación:** campos requeridos, longitudes máximas, tipo MIME y extensión CV, rate limit (máx 5/hora global)
- **DB:** `postulaciones` (insert)
- **Storage:** bucket `cv` (upload si fulltime)
- **Consumido por:** `src/components/sections/PostulacionForm.tsx`

### `actualizarEstadoPostulacion(id: string, estado: 'aprobado' | 'rechazado')`
- **Cliente:** `createClient()` (respeta RLS)
- **Auth:** verifica user autenticado + `profiles.rol` en (master, empleado, comisionista)
- **DB:** `postulaciones` (update estado)
- **Consumido por:** `PostulacionesClient.tsx`

### `eliminarPostulacion(id: string)`
- **Cliente:** `createClient()` (respeta RLS)
- **Auth:** verifica user autenticado + `profiles.rol` en (master, empleado, comisionista)
- **DB:** `postulaciones` (delete)
- **Consumido por:** `PostulacionesClient.tsx`
