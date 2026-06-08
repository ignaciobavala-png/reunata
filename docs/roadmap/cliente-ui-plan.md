# Dashboard Cliente — UI Mayorista vs Minorista

## Estado: ✅ Implementado (12/5/2026)

---

## Lo que se implementó

### 1. Home diferenciada (`dashboard/cliente/page.tsx`)

**Query:** `profiles` trae `nombre, rol, aprobado, canal_id, razon_social`. Si tiene `canal_id`, se fetcha `canales` en paralelo con los pedidos.

**Minorista (`consumidor_final`):**
- Saludo "Hola, {nombre}" + badge índigo "Consumidor Final"
- Texto "Bienvenido a tu espacio de compras"
- 2 cards CTA: Catálogo + Mis Pedidos
- Últimos 5 pedidos

**Mayorista (`distribuidor`, `local`, `mercha`):**
- Saludo "Hola, {razon_social || nombre}" + badge con color del canal
- Panel de condiciones del canal: nombre, descripción, lista de precios activa
- 2 cards CTA: Catálogo + Mis Pedidos (con subtexto diferenciado)
- Últimos 5 pedidos

**Colores por canal:**
| Canal | Color |
|---|---|
| consumidor_final | `#6366f1` (índigo) |
| distribuidor | `#0ea5e9` (cyan) |
| local | `#10b981` (verde) |
| mercha | `#f59e0b` (ámbar) |

**Pantalla de aprobación pendiente:**
- Minorista: "Tu registro fue recibido. En breve habilitaremos tu acceso al catálogo."
- Mayorista: "Tu cuenta está siendo revisada por nuestro equipo comercial. Te contactaremos a la brevedad..."

---

### 2. Cuenta con campos mayoristas

**`cuenta/page.tsx`:** SELECT ampliado:
```
nombre, email, telefono, cuit_dni, condicion_fiscal, rol, aprobado,
razon_social, direccion, localidad, sitio_web, puntos_venta, clientes_activos
```

**`cuenta/CuentaForm.tsx`:** Sección "Datos de empresa" condicional:
```typescript
const esMayorista = ['distribuidor', 'local', 'mercha'].includes(rol)
```
Campos extra (solo mayoristas): Razón Social, Dirección, Localidad, Sitio Web, Puntos de Venta, Clientes Activos.

**`actions/cuenta.ts`:** `actualizarPerfil()` actualiza campos de empresa si vienen en el formData. Minoristas no se ven afectados porque sus formularios no incluyen esos inputs.

---

### 3. Login — botón Google (visual)

Archivo: `src/app/login/GoogleLoginButton.tsx`

- Componente `'use client'` independiente
- Logo G multicolor SVG, fondo blanco, sombra sutil, hover/active state
- Integrado en `login/page.tsx` entre el form y el link de registro
- Sin lógica OAuth — preparado para `signInWithOAuth` cuando se conecte

---

## Pendiente para Google OAuth (Sesión 4)

1. Habilitar **identity linking** en Supabase (Settings → Auth → Merge accounts)
2. Crear ruta `/auth/callback/route.ts` que intercambie el code por sesión
3. Agregar `onClick` en `GoogleLoginButton`:
   ```typescript
   const supabase = createClient()
   await supabase.auth.signInWithOAuth({
     provider: 'google',
     options: { redirectTo: `${origin}/auth/callback` }
   })
   ```
4. En el callback: detectar si el perfil está incompleto (sin razón social) → redirigir a `/registro/completar`
5. Mayoristas que usan Google necesitan completar datos de empresa después del OAuth

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/app/dashboard/cliente/page.tsx` | Home diferenciada mayorista/minorista |
| `src/app/dashboard/cliente/cuenta/page.tsx` | SELECT ampliado |
| `src/app/dashboard/cliente/cuenta/CuentaForm.tsx` | Sección empresa condicional |
| `src/app/actions/cuenta.ts` | Campos mayoristas en actualizarPerfil |
| `src/app/login/GoogleLoginButton.tsx` | Botón Google (nuevo, visual) |
| `src/app/login/page.tsx` | Importa GoogleLoginButton |
