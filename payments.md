# Reunata — Planificación de Pagos y Carrito

> El negocio es mayorista. Los pagos se realizan fuera de la plataforma (transferencia bancaria,
> efectivo o cheque). La web no procesa dinero: gestiona órdenes y confirma pagos manualmente.
> No se necesita pasarela de pagos (sin Stripe, sin MercadoPago).

---

## 1. Principio general

El flujo completo es:

```
Cliente arma carrito
  → envía pedido
    → ve instrucciones de pago (CBU / alias / efectivo / cheque)
      → paga por fuera de la web
        → sube comprobante (o avisa por otro canal)
          → Master/Empleado confirma el pago
            → pedido pasa a preparación → envío → entregado
```

La web es el **libro de pedidos y seguimiento**, no el punto de cobro.

---

## 2. Estados del pedido (ciclo de vida completo)

| Estado              | Quién lo activa        | Descripción                                              |
|---------------------|------------------------|----------------------------------------------------------|
| `borrador`          | Cliente                | Carrito en curso, aún no enviado                         |
| `pendiente_pago`    | Cliente (al enviar)    | Pedido enviado, esperando que el cliente pague           |
| `comprobante_subido`| Cliente                | Cliente subió foto/PDF del comprobante de pago           |
| `pago_confirmado`   | Master / Empleado      | Pago verificado manualmente, pedido listo para preparar  |
| `en_preparacion`    | Master / Empleado      | Se está armando el pedido                                |
| `enviado`           | Master / Empleado      | Despachado (puede incluir número de seguimiento)         |
| `entregado`         | Master / Empleado      | Confirmación de recepción                                |
| `cancelado`         | Master (o automático)  | Pedido cancelado, con nota de motivo                     |

> **Auto-cancelación**: si el cliente no sube comprobante en X días (configurable por el master),
> el sistema puede marcar el pedido como cancelado automáticamente. Opcional, se define con el cliente.

---

## 3. El carrito

### Comportamiento
- El carrito es un **pedido en estado `borrador`** guardado en Supabase, no en localStorage
- Persiste entre sesiones: el cliente puede cerrar y volver a encontrar su carrito
- Un cliente puede tener solo un carrito activo a la vez
- Puede agregar/quitar productos y cambiar cantidades libremente mientras está en `borrador`

### Cálculo de precios
- Los precios se muestran según la **lista de precios asignada** al cliente (`lista_precios` en su perfil)
- Si el cliente tiene `bonificacion_general > 0`, se aplica sobre el total de lista
- Los precios en la API vienen en **USD** → mostrar en USD como precio oficial
- Opcionalmente: mostrar equivalente en ARS usando cotización del dólar (traída de una API pública)
- El precio de cada ítem se **guarda como snapshot** al momento de confirmar el pedido (en `pedido_items.precio_unit`), para que cambios futuros de precio no alteren pedidos ya emitidos

### Mínimo de compra (opcional)
- El master puede configurar un monto mínimo de pedido por cliente o global
- Si el carrito no llega al mínimo, el botón "Enviar pedido" está deshabilitado con mensaje explicativo

---

## 4. Flujo del cliente — paso a paso

### Paso 1: Armar el carrito
- Cliente navega el catálogo, agrega productos con cantidad
- Ve subtotal en tiempo real
- Puede escribir una nota general al pedido (ej: "entregar en horario tarde")

### Paso 2: Confirmar y enviar
- Pantalla de resumen: items, cantidades, precios, bonificación aplicada, **total final**
- Botón "Enviar pedido"
- El pedido cambia de `borrador` a `pendiente_pago`
- Se guarda snapshot de precios en `pedido_items`

### Paso 3: Instrucciones de pago
- Inmediatamente después de enviar, la página muestra las instrucciones de pago:

```
────────────────────────────────────────
  Tu pedido fue recibido. Para confirmarlo,
  realizá el pago por alguno de estos medios:

  TRANSFERENCIA BANCARIA
  CBU:   0000000000000000000000
  Alias: reunata.compras
  Banco: [nombre del banco]
  A nombre de: [Razón social]
  CUIT: XX-XXXXXXXX-X

  CHEQUE
  A la orden de: [Razón social]
  Consultá fecha y condiciones con tu vendedor.

  EFECTIVO
  Coordiná con tu vendedor.

  Total a pagar: USD 1.240,00
  Referencia: Pedido #00045
────────────────────────────────────────
```

- Esta pantalla también es accesible desde "Mis pedidos → Detalle → Ver instrucciones de pago"
- Los datos bancarios se configuran desde el panel del master (tabla `configuracion`)

### Paso 4: Subir comprobante (opcional pero recomendado)
- El cliente puede subir una foto o PDF del comprobante de transferencia
- Guardado en Supabase Storage bajo `/comprobantes/{pedido_id}/`
- El pedido pasa a estado `comprobante_subido`
- El master/empleado recibe notificación

> **Si el pago es en efectivo o cheque**: el cliente puede omitir este paso y avisar
> directamente a su vendedor. El empleado o master confirma el pago manualmente.

---

## 5. Flujo del master/empleado — gestión de pagos

### Vista de pedidos pendientes de pago
- Lista de pedidos en estado `pendiente_pago` y `comprobante_subido`
- Badge visual diferenciando: "Esperando pago" vs "Comprobante subido"
- Al entrar al detalle: ver items, total, nota del cliente

### Revisión del comprobante
- Si el cliente subió comprobante: vista previa de la imagen/PDF en el panel
- El empleado valida contra el extracto bancario real
- Botones: **"Confirmar pago"** / **"Rechazar comprobante"** (con nota de motivo)

### Confirmación manual sin comprobante
- Para pagos en efectivo o cheque: el empleado puede confirmar el pago directamente
- Selector de medio de pago: Transferencia / Efectivo / Cheque
- Campo opcional: número de cheque o referencia de la transferencia

### Historial de pagos por cliente
- En la ficha de cada cliente: lista de pedidos con su medio de pago y fecha de confirmación
- Útil para llevar cuenta de clientes que deben, que pagan con cheque a fecha, etc.

---

## 6. Tablas de Supabase necesarias

### Actualización a tabla `pedidos`
Agregar campos de pago:

```sql
-- Campos a agregar a la tabla pedidos
estado               text,   -- actualizar CHECK con los nuevos estados
medio_pago           text CHECK (medio_pago IN ('transferencia', 'efectivo', 'cheque')),
referencia_pago      text,   -- número de transferencia, número de cheque, etc.
fecha_pago           timestamptz,
pago_confirmado_por  uuid REFERENCES profiles(id),
nota_cancelacion     text
```

### Tabla: `comprobantes`
```sql
comprobantes (
  id          serial PRIMARY KEY,
  pedido_id   uuid REFERENCES pedidos(id) ON DELETE CASCADE,
  url         text NOT NULL,        -- URL en Supabase Storage
  subido_at   timestamptz DEFAULT now()
)
```

### Actualización a tabla `configuracion`
Agregar los datos bancarios configurables por el master:

```sql
-- Claves en tabla configuracion (tipo clave-valor):
'banco_cbu'           → '0000000000000000000000'
'banco_alias'         → 'reunata.compras'
'banco_nombre'        → 'Banco Galicia'
'banco_razon_social'  → 'Reunata SRL'
'banco_cuit'          → '30-12345678-9'
'pedido_monto_minimo' → '100'          -- en USD, 0 = sin mínimo
'pedido_dias_vencimiento' → '3'        -- días antes de auto-cancelar por falta de pago
```

---

## 7. Notificaciones del sistema

| Evento                        | Notificado          | Canal                        |
|-------------------------------|---------------------|------------------------------|
| Cliente envía pedido          | Master + Empleados  | Badge en dashboard           |
| Cliente sube comprobante      | Master + Empleados  | Badge en dashboard           |
| Pago confirmado               | Cliente             | Badge en dashboard + email   |
| Comprobante rechazado         | Cliente             | Badge en dashboard + email   |
| Pedido enviado                | Cliente             | Badge en dashboard + email   |
| Pedido por vencer (sin pago)  | Cliente             | Email de recordatorio        |

> Los emails se pueden implementar con Resend (integración nativa de Vercel) en una segunda etapa.
> En la primera etapa solo los badges en el dashboard son suficientes.

---

## 8. Exportación de pedidos (puente con Gesu)

Dado que la API de Gesu es de solo lectura, Gastón carga los pedidos manualmente en su sistema de gestión. Para facilitar ese proceso, cada pedido confirmado se puede exportar en tres formatos:

### Formatos disponibles
- **CSV** — importable en Gesu o cualquier sistema de gestión
- **Excel (.xlsx)** — para revisión y archivo en planillas
- **PDF** — para imprimir o enviar por WhatsApp/email como remito informal

### Contenido del export
| Campo           | Descripción                              |
|-----------------|------------------------------------------|
| Código interno  | `codigoInterno` del producto (clave Gesu)|
| Descripción     | Nombre del producto                      |
| Cantidad        | Unidades pedidas                         |
| Precio unitario | Precio snapshot al momento del pedido    |
| Subtotal        | Cantidad × precio                        |
| Total           | Total del pedido                         |
| Cliente         | Razón social + CUIT                      |
| Fecha           | Fecha de confirmación del pedido         |
| Nro. pedido     | ID interno de Reunata                    |

### Librerías a usar
- `xlsx` (SheetJS) — para CSV y Excel desde el servidor
- `@react-pdf/renderer` — para PDF con diseño de marca

### Acceso
- Desde el detalle de cada pedido en el dashboard (master y empleado)
- Botón "Exportar" con selector de formato: PDF / Excel / CSV
- También disponible exportación masiva: todos los pedidos de un período filtrado

---

## 9. Lo que NO hace el sistema

- No procesa tarjetas de crédito/débito
- No genera facturas (eso queda en el sistema Gesu del cliente)
- No hace conciliación automática bancaria
- No retiene fondos ni hace escrow

---

## 10. Orden de implementación sugerido

1. Carrito: modelo `borrador` en Supabase, UI de carrito con precios en tiempo real
2. Pantalla de resumen y envío de pedido (cambio de estado a `pendiente_pago`)
3. Pantalla de instrucciones de pago post-confirmación
4. Upload de comprobante por el cliente
5. Vista de pagos pendientes para master/empleado
6. Confirmación/rechazo manual de pago
7. Notificaciones internas (badges en dashboard)
8. Emails transaccionales con Resend (segunda etapa)
9. Auto-cancelación por vencimiento (opcional, tercera etapa)
