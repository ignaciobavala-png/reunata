-- profiles.email se editaba desde la cuenta sin tocar el email de login, así que
-- las dos direcciones podían divergir: la persona seguía entrando con la vieja y
-- los mails de auth (recuperar contraseña) le llegaban ahí, mientras que las
-- notificaciones del sitio salían a la nueva.
--
-- A partir de acá el email de auth es la fuente de verdad y profiles lo espeja.
-- El cambio se pide con auth.updateUser(), que exige confirmar por mail; recién
-- cuando GoTrue lo aplica sobre auth.users, este trigger lo baja a profiles.

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  execute function public.sync_profile_email();
