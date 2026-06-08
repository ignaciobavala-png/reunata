# Dashboard Cliente Diferenciado — Plan de Implementación

## Situación actual

El dashboard `/dashboard/cliente/` es genérico: la misma UI para todos los roles cliente (`consumidor_final`, `distribuidor`, `local`, `mercha`). No diferencia entre minorista y mayorista.

## Objetivo

- **Minoristas** (`consumidor_final`): UI B2C simple.
- **Mayoristas** (`distribuidor`, `local`, `mercha`): UI B2B con info del canal y datos de empresa.

El sistema de canales ya funciona: el admin asigna productos por canal en `Productos > Canales`. Los precios son correctos por `lista_precios`. Solo falta diferenciar la UI.

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/app/dashboard/cliente/page.tsx` | Home diferenciada: minorista B2C / mayorista B2B |
| `src/app/dashboard/cliente/cuenta/page.tsx` | Ampliar SELECT de profiles con campos mayoristas |
| `src/app/dashboard/cliente/cuenta/CuentaForm.tsx` | Sección "Datos de empresa" condicional |
| `src/app/actions/cuenta.ts` | `actualizarPerfil()` actualiza campos mayoristas |

---

## 1. `page.tsx` — Home diferenciada

**Query adicional:**
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('id, nombre, rol, aprobado, canal_id, razon_social')
  .eq('id', user.id)
  .single()

const { data: canal } = profile?.canal_id
  ? await supabase.from('canales').select('nombre, descripcion, lista_precios').eq('id', profile.canal_id).single()
  : { data: null }

const esMayorista = ['distribuidor', 'local', 'mercha'].includes(profile.rol)
```

**Vista minorista:**
- "Hola, {nombre}" + badge "Consumidor Final" (índigo `#6366f1`)
- 2 cards CTA grandes: "Ver catálogo" + "Mis pedidos"
- Tabla de últimos 5 pedidos
- Si `!aprobado`: texto "Tu cuenta está siendo verificada…"

**Vista mayorista:**
- "Hola, {razon_social || nombre}" + badge del canal con color específico
- Panel informativo: nombre del canal, descripción, lista de precios activa
- 2 cards CTA + tabla de últimos pedidos
- Si `!aprobado`: "Tu cuenta está siendo revisada por nuestro equipo comercial. Te contactaremos pronto."

**Colores por canal** (mismos que usa `CanalesClient.tsx`):
```typescript
const CANAL_COLOR: Record<string, string> = {
  consumidor_final: '#6366f1',
  distribuidor:     '#0ea5e9',
  local:            '#10b981',
  mercha:           '#f59e0b',
}
```

---

## 2. `cuenta/page.tsx` — Ampliar query

```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('nombre, email, telefono, cuit_dni, condicion_fiscal, rol, aprobado, razon_social, direccion, localidad, sitio_web, puntos_venta, clientes_activos')
  .eq('id', user.id)
  .single()
```

Pasar todos los campos como props a `<CuentaForm>`.

---

## 3. `cuenta/CuentaForm.tsx` — Sección empresa condicional

```typescript
const esMayorista = ['distribuidor', 'local', 'mercha'].includes(rol)
```

Si `esMayorista`, agregar sección "Datos de empresa" (igual al estilo de las secciones Contacto y Facturación ya existentes):

| Campo | name | type |
|---|---|---|
| Razón Social | `razon_social` | text |
| Dirección | `direccion` | text |
| Localidad | `localidad` | text |
| Sitio Web / Red Social | `sitio_web` | text |
| Puntos de Venta | `puntos_venta` | number |
| Clientes Activos | `clientes_activos` | number |

---

## 4. `actions/cuenta.ts` — `actualizarPerfil()` ampliada

```typescript
export async function actualizarPerfil(userId: string, formData: FormData) {
  const supabase = await createClient()

  const updates: Record<string, unknown> = {
    nombre:           formData.get('nombre'),
    email:            formData.get('email'),
    telefono:         formData.get('telefono'),
    cuit_dni:         formData.get('cuit_dni'),
    condicion_fiscal: formData.get('condicion_fiscal'),
  }

  // Campos mayoristas: solo se actualizan si vienen en el form
  for (const campo of ['razon_social', 'direccion', 'localidad', 'sitio_web']) {
    const val = formData.get(campo)
    if (val !== null) updates[campo] = val || null
  }
  const pv = formData.get('puntos_venta')
  if (pv !== null) updates.puntos_venta = pv ? Number(pv) : null
  const ca = formData.get('clientes_activos')
  if (ca !== null) updates.clientes_activos = ca ? Number(ca) : null

  const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/cliente/cuenta')
}
```

---

## Convenciones

- Siempre `var(--color-*)` inline, nunca clases genéricas de Tailwind.
- No hay rutas nuevas: todo se hace en los 4 archivos existentes.
- `pnpm tsc --noEmit` antes de commitear.

---

## Verificación

1. Login como `consumidor_final` → home muestra UI simple + badge índigo.
2. Login como `distribuidor` aprobado → home muestra panel del canal + badge cyan.
3. En `/cuenta`, mayorista ve sección "Datos de empresa"; minorista no.
4. Guardar datos empresa como mayorista → verificar en `profiles` que se actualizaron.
5. Guardar cuenta como minorista → los campos mayoristas no se tocan.
