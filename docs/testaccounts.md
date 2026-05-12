# Cuentas de Prueba

> ⚠️ Solo para desarrollo local. No subir a producción.

## Usuarios de prueba (creados con SQL en Supabase)

| Tipo | Email | Contraseña | Canal | Lista de precios |
|---|---|---|---|---|
| Mayorista | `mayorista@test.com` | `Test1234!` | Distribuidor | Lista 1 |
| Minorista | `minorista@test.com` | `Test1234!` | Consumidor Final | Lista 5 |

### Datos del mayorista
- Razón Social: Distribuidora Test SA
- Dirección: Av. Corrientes 1234
- Localidad: CABA
- CUIT: 30-12345678-9

## Admin

| Rol | Email | Contraseña |
|---|---|---|
| Master | `admin@reunata.com` | *(ver script `scripts/create-admin.mjs`)* |

## Eliminar cuentas de prueba

```sql
DELETE FROM auth.users WHERE email IN ('mayorista@test.com', 'minorista@test.com');
```

## SQL para recrearlas

Ver `docs/loginrefactor.md` — sección "SQL test".
