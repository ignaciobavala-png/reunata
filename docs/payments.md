# Reunata — Pagos y Gestión de Cobros

> Documento vivo. Refleja las decisiones reales de Gastón sobre cómo cobra.
> Última actualización: 2026-04-18

---

## 1. Principio general

La web **no procesa dinero**. Gestiona órdenes y confirma pagos manualmente.
El flujo completo es:

```
Cliente arma carrito
  → envía pedido
    → ve instrucciones de pago (siempre visibles, sin fricción)
      → paga por fuera de la web
        → sube comprobante (o avisa por otro canal)
          → Master/Empleado confirma el pago
            → pedido pasa a preparación → envío → entregado
```

La única excepción es **MercadoPago para minoristas web**, donde el cobro
sí ocurre dentro de la plataforma.

---

## 2. Formas de pago por tipo de cliente

### Minoristas Web (`consumidor_final`)

| Método | Estado |
|--------|--------|
| MercadoPago (tarjeta, débito, QR) | A implementar con SDK de MP |

El minorista web paga online en el momento. El pedido pasa directamente
a `pago_confirmado` al recibir el webhook de aprobación de MP.

> **Pendiente definir:** monto mínimo para minoristas, si aplica carrito o
> formulario de contacto directo.

---

### Mayoristas (`distribuidor`, `local`, `mercha`)

Los mayoristas pactan con Gastón. El objetivo es tener la info de pago
**siempre a mano** para que pagar no sea un obstáculo. A medida que el
negocio crece, las condiciones se irán formalizando.

| Método | Fiscalidad | Observaciones |
|--------|-----------|---------------|
| Efectivo | Blanco o Negro | Depende de si se emite comprobante |
| Transferencia Blanco | Blanco | Transferencia bancaria estándar, con CBU/alias |
| Transferencia Cueva | Negro | Informal. Tiene recargo: **sin IVA + 5%** sobre el total |
| E-cheq propio | Blanco | Cheque electrónico emitido por el cliente |
| E-cheq de tercero | Blanco | Cheque electrónico recibido por el cliente y endosado |
| Cheque físico propio | Blanco/Gris | El cliente es responsable de que llegue a Reunata |
| Cheque físico de tercero | Blanco/Gris | Igual que el anterior, endosado |
| Cuenta Corriente | Blanco | Solo clientes de mucha confianza. **Evitar en lo posible** |

---

## 3. Análisis de cada método para el sistema

### Efectivo

- **Flujo:** cliente avisa que pagó en efectivo, empleado/master confirma manualmente
- **En el sistema:** selector `efectivo`, campo de nota libre (ej: "pagó en efectivo en reunión")
- **Comprobante:** no aplica; el empleado confirma directo

### Transferencia Blanco

- **Flujo:** cliente recibe CBU/alias, transfiere, sube comprobante
- **En el sistema:** selector `transferencia_blanco`, referencia de la transferencia
- **Mostrar siempre:** CBU, alias, banco, razón social, CUIT — datos de `configuracion`

### Transferencia Cueva

- **Flujo:** igual que transferencia blanco pero a cuenta informal
- **Recargo:** `total_sin_iva * 1.05` — el sistema debe calcularlo y mostrarlo
- **En el sistema:** selector `transferencia_cueva`, mostrar el total ajustado prominentemente
- **Datos bancarios:** cuenta cueva no se guarda en `configuracion` pública; Gastón la comunica por separado (WhatsApp, etc.). El sistema solo informa "coordiná con tu vendedor para los datos de la transferencia cueva"
- **Pendiente definir:** ¿cómo se indica la cuenta cueva de forma segura?

### E-cheq (propio o de tercero)

- **Flujo:** cliente emite/endosa e-cheq, lo transfiere digitalmente, Reunata lo recibe en su app bancaria
- **En el sistema:** selector `echeq_propio` / `echeq_tercero`, campo para número de cheque y fecha de cobro
- **Comprobante:** captura de pantalla del e-cheq emitido
- **A tener en cuenta:** los e-cheqs a fecha generan un descalce de liquidez; útil registrar la fecha de cobro para seguimiento

### Cheque físico (propio o de tercero)

- **Flujo:** cliente entrega el cheque físicamente (por correo, en mano, via cadete)
- **El cliente es responsable de que llegue a Reunata**
- **En el sistema:** selector `cheque_fisico_propio` / `cheque_fisico_tercero`, campo para número, banco, fecha de cobro
- **Comprobante:** foto del cheque
- **Riesgo:** cheque rechazado. El sistema puede registrar incidentes por cliente

### Cuenta Corriente

- **¿Qué es?** El cliente compra hoy y paga en cuotas o a fecha pactada.
  Reunata le "fía" sin cobrar hasta que el cliente vaya pagando.
- **Problema:** requiere mucho seguimiento manual. Gastón quiere **evitarlo**.
- **Solo para clientes de mucha confianza**, habilitado manualmente por el master.
- **En el sistema:**
  - Flag `permite_cuenta_corriente` en `profiles`
  - Tabla `cuenta_corriente_movimientos` con saldo, vencimientos y pagos parciales
  - Dashboard de seguimiento: saldo adeudado, pedidos sin pagar, última fecha de pago
- **Prioridad de implementación:** baja. Por ahora: campo de nota en pedido para marcar "CC" + seguimiento manual

---

## 4. Impacto en la base de datos

### Campo `medio_pago` en tabla `pedidos`

El CHECK actual es demasiado genérico. Reemplazar por:

```sql
alter table public.pedidos
  drop constraint pedidos_medio_pago_check;

alter table public.pedidos
  add constraint pedidos_medio_pago_check check (medio_pago in (
    'mercadopago',
    'transferencia_blanco',
    'transferencia_cueva',
    'efectivo',
    'echeq_propio',
    'echeq_tercero',
    'cheque_fisico_propio',
    'cheque_fisico_tercero',
    'cuenta_corriente'
  ));
```

### Nuevos campos en `pedidos`

```sql
alter table public.pedidos
  -- Recargo calculado para transferencia cueva
  add column if not exists recargo_cueva     numeric default 0,
  -- Fecha de cobro efectivo del cheque
  add column if not exists fecha_cobro_cheq  date,
  -- Número de cheque / referencia e-cheq
  add column if not exists nro_cheque        text;
```

### Nuevo flag en `profiles` (para CC)

```sql
alter table public.profiles
  add column if not exists permite_cuenta_corriente boolean default false;
```

### Nueva tabla `cuenta_corriente_movimientos` (baja prioridad)

```sql
create table public.cc_movimientos (
  id          serial primary key,
  cliente_id  uuid references public.profiles(id),
  pedido_id   uuid references public.pedidos(id),
  tipo        text check (tipo in ('cargo', 'pago_parcial', 'pago_total')),
  monto       numeric not null,
  fecha       date not null,
  nota        text,
  created_at  timestamptz default now()
);
```

---

## 5. Reglas de negocio — recargo Cueva

Cuando el cliente elige Transferencia Cueva, el sistema debe:

1. Calcular `total_sin_iva = total / 1.21` (asumiendo todos los productos tienen IVA 21%)
2. Calcular `total_cueva = total_sin_iva * 1.05`
3. Mostrar el desglose claramente:

```
Total de tu pedido:            USD 1.000,00
  — Base sin IVA:              USD  826,45
  — Recargo cueva (5%):        USD   41,32
Total a transferir (cueva):    USD  867,77
```

> **Nota:** el recargo cueva no se suma al pedido oficial. Es un acuerdo
> separado entre Gastón y el cliente. El `total_usd` del pedido sigue
> siendo el precio de lista; el `recargo_cueva` se guarda como referencia.

---

## 6. Cómo mostrar las instrucciones de pago

**Principio de Gastón: que la info esté siempre a mano, que no sea un obstáculo.**

Las instrucciones de pago deben ser:
- Visibles **inmediatamente** después de enviar el pedido
- Accesibles **en cualquier momento** desde el detalle del pedido
- **Copiables con un clic** (CBU, alias, monto)

Diseño de la pantalla de instrucciones:

```
┌─────────────────────────────────────────────────────┐
│  Pedido #0045 — USD 1.240,00                        │
│  Elegí cómo pagás:                                  │
│                                                     │
│  [Transferencia Blanco]  [E-cheq]  [Efectivo]       │
│  [Transferencia Cueva]   [Cheque]  [Cuenta Cte.]    │
│                                                     │
│  ── Transferencia Blanco ──────────────────────     │
│  CBU:   0000000000000000000000  [copiar]            │
│  Alias: reunata.compras         [copiar]            │
│  Banco: Galicia                                     │
│  A nombre de: Reunata SRL                           │
│  CUIT: 30-12345678-9                                │
│  Monto exacto: USD 1.240,00     [copiar]            │
│                                                     │
│  Referencia: Pedido #0045                           │
│                                                     │
│  [Subir comprobante]    [Ya pagué, aviso por WA]   │
└─────────────────────────────────────────────────────┘
```

- Cada tab muestra las instrucciones específicas de ese método
- Para Cueva: muestra el total ajustado y el mensaje "coordiná los datos con tu vendedor"
- Para Cheque/E-cheq: muestra dirección/instrucciones para entrega
- Para Efectivo y CC: "Coordiná con tu vendedor"
- Botón de WhatsApp directo con el monto y número de pedido prellenado

---

## 7. MercadoPago para minoristas

El minorista web (`consumidor_final`) paga con MP al confirmar el pedido.

### Flujo técnico

```
Cliente confirma pedido
  → frontend llama a /api/checkout/mp (POST)
    → servidor crea preferencia de MP con SDK
      → redirect al checkout de MP
        → MP redirige a /checkout/success o /checkout/failure
          → webhook de MP confirma el pago
            → servidor actualiza pedido a pago_confirmado
```

### Variables de entorno necesarias

```
MP_ACCESS_TOKEN=        # token de vendedor (producción)
MP_PUBLIC_KEY=          # para el SDK frontend
MP_WEBHOOK_SECRET=      # para validar webhooks
```

### Tablas afectadas

```sql
-- En pedidos:
-- medio_pago = 'mercadopago'
-- referencia_pago = payment_id de MP
-- El webhook confirma el pago automáticamente
```

### Estado de implementación

- [ ] Crear cuenta MP Vendedor de Reunata
- [ ] SDK: `npm install @mercadopago/sdk-react mercadopago`
- [ ] Route `/api/checkout/mp` — crea preferencia
- [ ] Route `/api/webhooks/mp` — procesa eventos
- [ ] Página `/checkout/success` y `/checkout/failure`
- [ ] Solo habilitar para rol `consumidor_final`

---

## 8. Estados del pedido (actualizados)

| Estado | Quién lo activa | Descripción |
|--------|-----------------|-------------|
| `borrador` | Cliente | Carrito en curso, no enviado |
| `pendiente_pago` | Cliente (al enviar) | Esperando pago del cliente |
| `comprobante_subido` | Cliente | Subió foto/PDF del comprobante |
| `pago_confirmado` | Master/Empleado o webhook MP | Pago verificado |
| `en_preparacion` | Master/Empleado | Armando el pedido |
| `enviado` | Master/Empleado | Despachado |
| `entregado` | Master/Empleado | Recibido |
| `cancelado` | Master o automático | Cancelado con nota |

---

## 9. Notificaciones

| Evento | Notificado | Canal |
|--------|-----------|-------|
| Cliente envía pedido | Master + Empleados | Badge en dashboard |
| Cliente sube comprobante | Master + Empleados | Badge en dashboard |
| Pago confirmado (manual o MP) | Cliente | Badge + email |
| Comprobante rechazado | Cliente | Badge + email |
| Pedido enviado | Cliente | Badge + email |
| Cheque próximo a vencer | Master | Badge en dashboard |
| Pedido sin pago en X días | Cliente | Email de recordatorio |

> Emails con Resend — segunda etapa.

---

## 10. Exportación de pedidos (puente con Gesu)

Gesu es de solo lectura. Gastón carga pedidos manualmente allí.

**Formatos de export por pedido confirmado:**
- **CSV** — importable en Gesu
- **Excel (.xlsx)** — para archivo en planillas
- **PDF** — remito informal para enviar por WhatsApp/email

**Librerías:** `xlsx` (SheetJS) + `@react-pdf/renderer`

---

## 11. Orden de implementación

### Prioridad alta
1. Pantalla de instrucciones de pago post-pedido (con tabs por método)
2. Upload de comprobante por el cliente
3. Confirmación/rechazo manual de pago en el dashboard
4. Migración SQL: expandir `medio_pago` CHECK + campos cheque/cueva

### Prioridad media
5. MercadoPago para minoristas
6. Cálculo automático del recargo cueva
7. Exportación PDF/Excel de pedidos

### Prioridad baja
8. Cuenta Corriente: seguimiento de saldo y movimientos
9. Notificaciones por email con Resend
10. Auto-cancelación por vencimiento
