-- Agregar columnas para registro mayorista a profiles

alter table public.profiles
  add column if not exists razon_social    text,
  add column if not exists direccion       text,
  add column if not exists localidad       text,
  add column if not exists sitio_web       text,
  add column if not exists puntos_venta    integer,
  add column if not exists clientes_activos integer;

-- Actualizar handle_new_user() para incluir nombre desde metadata
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nombre, rol)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'nombre',
    coalesce(new.raw_user_meta_data->>'rol', 'consumidor_final')
  );
  return new;
end;
$$;
