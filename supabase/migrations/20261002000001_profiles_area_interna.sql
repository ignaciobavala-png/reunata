-- Área de un empleado: Administración o Depósito (pedido del tester, 02/10/2026).
--
-- No son valores nuevos de `profiles.rol` a propósito: el rol se chequea por
-- nombre en ~40 policies RLS y en el código ('master' / 'empleado'), y todo rol
-- que no sea interno se trata como cliente (src/lib/roles.ts). Un rol nuevo
-- quedaría como cliente en todos lados. Ambas áreas siguen siendo `empleado` para
-- la base; el área solo decide qué secciones del panel ve (Sidebar + proxy).
--
-- null = Administración, que es lo que veía todo empleado hasta hoy.
-- Solo master puede escribirla: los empleados no tienen policy de UPDATE sobre
-- su propio perfil (cliente_own_profile es solo para clientes).

alter table public.profiles
  add column if not exists area text
  check (area is null or area in ('administracion', 'deposito'));

comment on column public.profiles.area is
  'Área de un empleado (rol = empleado): administracion | deposito. null = administracion. Recorta el panel, no la base.';
