-- Orden de fotos de producto: empates y huecos hacían que cada consulta
-- desempatara distinto (el admin mostraba un orden y la tienda otro), y que
-- "mover" entre dos fotos con el mismo orden no cambiara nada.
--
-- 1) Normaliza el orden existente a 0..n-1 por producto.
-- 2) Impide nuevos empates con una unique deferrable (se chequea al final del
--    statement, así un UPDATE masivo puede reasignar todas las posiciones).
-- 3) RPC para reordenar todas las fotos de un producto en un solo statement.

with numeradas as (
  select id,
         row_number() over (
           partition by producto_id
           order by coalesce(orden, 0), id
         ) - 1 as nuevo
    from producto_fotos
)
update producto_fotos f
   set orden = n.nuevo
  from numeradas n
 where n.id = f.id
   and f.orden is distinct from n.nuevo;

alter table producto_fotos alter column orden set default 0;
update producto_fotos set orden = 0 where orden is null;
alter table producto_fotos alter column orden set not null;

alter table producto_fotos
  drop constraint if exists producto_fotos_producto_id_orden_key;

alter table producto_fotos
  add constraint producto_fotos_producto_id_orden_key
  unique (producto_id, orden) deferrable initially immediate;

create or replace function reordenar_fotos(p_producto_id int, p_ids int[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total int;
begin
  select count(*) into total from producto_fotos where producto_id = p_producto_id;
  if total <> coalesce(array_length(p_ids, 1), 0) then
    raise exception 'La lista de fotos no coincide con las del producto (% vs %)',
      coalesce(array_length(p_ids, 1), 0), total;
  end if;

  update producto_fotos f
     set orden = nuevo.pos - 1
    from unnest(p_ids) with ordinality as nuevo(id, pos)
   where f.id = nuevo.id
     and f.producto_id = p_producto_id;
end;
$$;

revoke all on function reordenar_fotos(int, int[]) from public, anon, authenticated;
grant execute on function reordenar_fotos(int, int[]) to service_role;
