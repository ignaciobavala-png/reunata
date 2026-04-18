insert into public.configuracion (clave, valor)
values ('whatsapp_ventas', '')
on conflict (clave) do nothing;
