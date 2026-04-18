# Reunata — Planificación del Dashboard

> Panel de control interno del marketplace. Tres vistas según rol: Master, Empleado, Cliente.
> El acceso al dashboard requiere sesión activa. El middleware de Next.js redirige según el rol.

---

## Acceso por rol

| Ruta              | Master | Empleado | Cliente |
|-------------------|:------:|:--------:|:-------:|
| `/dashboard`      | ✓      | ✓        | ✓       |
| `/dashboard/admin/*` | ✓   | ✗        | ✗       |
| `/dashboard/empleado/*` | ✓ | ✓       | ✗       |
| `/dashboard/cliente/*` | ✗  | ✗        | ✓       |

---

## 1. Master Admin

El master tiene acceso total. Su dashboard es el panel de control del negocio.

### 1.1 Inicio / Overview
- Resumen del día: pedidos nuevos, pedidos pendientes, total facturado
- Accesos rápidos a las secciones más usadas
- Estado de la última sincronización con la API de Gesu (fecha/hora + estado ok/error)
- Botón "Sincronizar ahora" para forzar una sync manual

### 1.2 Productos
- Tabla de todos los productos sincronizados desde Gesu
- Columnas: código, título, categoría, stock, lista1..5, activo/inactivo
- Filtros: por categoría, por marca, por stock bajo mínimo
- Búsqueda por nombre o código interno
- **Edición manual**: el master puede sobrescribir precio o descripción de un producto puntual (override local, no toca Gesu)
- Activar/desactivar productos para que aparezcan o no en el catálogo público

### 1.3 Catálogo — Contenido Visual
Sección para gestionar lo que el cliente ve en la página pública.

#### Carrusel de fotos (homepage)
Imágenes de marketing/colección. No van atadas a un producto específico.

- Lista de imágenes actuales con preview en miniatura
- Subir nuevas fotos (drag & drop o selector de archivos)
- Reordenar imágenes (drag to reorder)
- Eliminar imágenes
- Imágenes guardadas en Supabase Storage (`/carrusel/`)

#### Fotos de productos del catálogo
Cada producto puede tener una o más fotos vinculadas. El match se hace al momento de subir.

- **Paso 1 — Seleccionar producto**: buscador searchable por nombre o código interno (datos de la tabla `productos` sincronizada desde Gesu)
- **Paso 2 — Subir foto**: drag & drop o selector, una o varias fotos
- Guardadas en Supabase Storage bajo `/productos/{codigo_interno}/`
- Se pueden reordenar y eliminar fotos por producto
- La sync con Gesu actualiza precios/stock pero **nunca toca las fotos**
- Tabla en Supabase: `producto_fotos` con FK a `productos.id`

#### Textos editables de la página
- Hero: título principal, subtítulo, texto del botón CTA
- Sección "Nosotros": párrafo descriptivo
- Footer: texto de contacto, dirección, horarios
- Campos editables tipo rich text simple (sin HTML crudo)
- Cambios se guardan en una tabla `contenido` en Supabase y se reflejan en la web en tiempo real

### 1.4 Pedidos
- Tabla de todos los pedidos del sistema
- Columnas: número, cliente, fecha, estado, total, empleado asignado
- Filtros: por estado, por fecha, por empleado, por cliente
- Detalle de cada pedido: items, cantidades, precios, notas
- Cambiar estado del pedido (pendiente → confirmado → en proceso → enviado → entregado)
- Asignar pedido a un empleado
- Cancelar pedido con nota de motivo

### 1.5 Clientes
- Tabla de todos los clientes registrados
- Columnas: nombre/razón social, CUIT, email, lista de precios, bonificación, estado (pendiente/activo)
- **Aprobar o rechazar solicitudes de registro** (clientes en estado "pendiente")
- Asignar o cambiar la lista de precios de un cliente
- Asignar bonificación extra (porcentaje de descuento sobre la lista)
- Ver el historial de pedidos de cada cliente
- Desactivar cuenta de un cliente

### 1.6 Empleados
- Lista de empleados activos
- Crear empleado: nombre + email → Supabase envía invitación por email
- Desactivar empleado (no se elimina, se archiva)
- Ver pedidos asignados a cada empleado
- (Futuro) asignar permisos extra granulares por empleado

### 1.7 Sincronización
- Historial de sincronizaciones: fecha, tipo (productos/clientes), registros actualizados, estado
- Configurar frecuencia de sync (cada 1h, 6h, 24h)
- Botón sync manual por tipo (productos o clientes)
- Alertas si la última sync falló

### 1.8 Configuración
- Datos del negocio: nombre, logo, datos de contacto
- Tipo de cambio: configurar si los precios se muestran en USD, ARS, o ambos
- Mapeo de listas de precios: qué lista (1-5) corresponde a cada tipo de cliente

---

## 2. Empleado

Vista operativa. Sin acceso a datos financieros sensibles ni configuración.

### 2.1 Inicio / Overview
- Mis pedidos asignados hoy
- Pedidos sin asignar disponibles para tomar
- Accesos rápidos: ver pedidos, buscar cliente

### 2.2 Pedidos
- Tabla de pedidos asignados al empleado
- Tabla de pedidos sin asignar (puede "tomar" un pedido)
- Detalle de cada pedido: items, cantidades, cliente, notas
- Cambiar estado del pedido (confirmar, marcar como en proceso, enviado)
- Agregar notas internas al pedido
- **NO puede** cancelar pedidos (solo el master)
- **NO puede** ver el total con precios de costo

### 2.3 Clientes
- Búsqueda de clientes por nombre o email
- Ver datos de contacto del cliente (teléfono, email, dirección)
- Ver historial de pedidos del cliente
- **NO puede** cambiar lista de precios ni aprobar registros

### 2.4 Catálogo (solo consulta)
- Ver el catálogo completo de productos con stock
- Buscar producto para informar disponibilidad a un cliente
- **NO ve** precio de compra ni márgenes

---

## 3. Cliente

Vista de compra. Solo ve y gestiona sus propias cosas.

### 3.1 Inicio
- Resumen de cuenta: pedidos activos, último pedido
- Acceso rápido al catálogo y a sus pedidos
- Notificación si hay un pedido con novedad (enviado, confirmado, etc.)

### 3.2 Catálogo
- Todos los productos activos, con su precio según la lista asignada
- Filtros: por categoría, por marca
- Búsqueda por nombre o código
- Vista grilla o lista
- Detalle de producto: fotos, descripción, precio, stock disponible
- Botón "Agregar al pedido"

### 3.3 Mis Pedidos
- Lista de todos sus pedidos con estado y fecha
- Pedido en curso: puede agregar o quitar productos mientras está en estado "pendiente"
- Ver detalle de cada pedido: items, cantidades, precios, total
- Seguimiento de estado: pendiente → confirmado → en proceso → enviado → entregado
- **NO puede** modificar un pedido ya confirmado

### 3.4 Nuevo Pedido
- Carrito de compras: agregar productos, cambiar cantidades
- Ver subtotal en tiempo real con su lista de precios
- Aplicar bonificación general si tiene asignada
- Enviar pedido con nota opcional
- Confirmación con resumen antes de enviar

### 3.5 Mi Cuenta
- Ver y editar datos de contacto: teléfono, dirección de entrega, email
- Ver su lista de precios asignada (nombre, no los valores)
- Cambiar contraseña

---

## 4. Componentes compartidos entre roles

- **Notificaciones**: badge en el ícono de campana con novedades según rol
  - Master: solicitudes de registro pendientes, pedidos nuevos, sync fallida
  - Empleado: pedidos asignados nuevos, cambios de estado
  - Cliente: cambios de estado en sus pedidos
- **Sidebar / Nav lateral**: colapsable en mobile, fijo en desktop
- **Header del dashboard**: logo, nombre del usuario, rol, botón cerrar sesión

---

## 5. Estructura de rutas del dashboard

```
/dashboard                         → Redirect según rol al overview correspondiente

/dashboard/admin                   → Overview master
/dashboard/admin/productos         → Gestión de productos
/dashboard/admin/catalogo          → Carrusel + textos editables
/dashboard/admin/pedidos           → Todos los pedidos
/dashboard/admin/clientes          → Gestión de clientes + aprobaciones
/dashboard/admin/clientes/[id]     → Detalle de cliente
/dashboard/admin/empleados         → Gestión de empleados
/dashboard/admin/sync              → Estado y configuración de sync
/dashboard/admin/configuracion     → Ajustes generales

/dashboard/empleado                → Overview empleado
/dashboard/empleado/pedidos        → Mis pedidos asignados + sin asignar
/dashboard/empleado/pedidos/[id]   → Detalle de pedido
/dashboard/empleado/clientes       → Búsqueda de clientes
/dashboard/empleado/catalogo       → Catálogo (solo consulta)

/dashboard/cliente                 → Overview cliente
/dashboard/cliente/catalogo        → Catálogo con sus precios
/dashboard/cliente/pedidos         → Mis pedidos
/dashboard/cliente/pedidos/nuevo   → Nuevo pedido / carrito
/dashboard/cliente/pedidos/[id]    → Detalle de pedido
/dashboard/cliente/cuenta          → Mi cuenta
```

---

## 6. Tablas adicionales de Supabase necesarias

### `contenido`
Para los textos editables de la página.
```sql
contenido (
  clave   text PRIMARY KEY,   -- ej: "hero_titulo", "hero_subtitulo", "nosotros_texto"
  valor   text,
  updated_at timestamptz DEFAULT now()
)
```

### `carrusel`
Para las imágenes del carrusel.
```sql
carrusel (
  id        serial PRIMARY KEY,
  url       text NOT NULL,        -- URL en Supabase Storage
  orden     integer DEFAULT 0,
  activo    boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
)
```

---

## 7. Orden de implementación sugerido

1. Layout base del dashboard: sidebar + header + protección por rol (middleware)
2. Dashboard cliente: catálogo con precios, pedidos, carrito
3. Dashboard empleado: vista de pedidos, cambio de estado
4. Dashboard master — pedidos y clientes (aprobar registros)
5. Dashboard master — productos (activar/desactivar, overrides)
6. Dashboard master — catálogo visual (carrusel + textos)
7. Dashboard master — empleados (invitación por email)
8. Dashboard master — sync y configuración
