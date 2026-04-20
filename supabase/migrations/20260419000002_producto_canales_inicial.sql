-- Asigna todos los productos activos a todos los canales como punto de partida.
-- El master puede remover productos de canales específicos desde el panel de admin.

insert into public.producto_canales (producto_id, canal_id)
select p.id, c.id
from public.productos p
cross join public.canales c
where p.activo = true
on conflict do nothing;
