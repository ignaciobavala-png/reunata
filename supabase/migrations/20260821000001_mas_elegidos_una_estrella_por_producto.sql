-- "Más elegidos" (home) sale de producto_fotos.destacada. Dos problemas:
--
-- 1) Un producto dado de baja (activo = false) seguía con la estrella puesta,
--    así que seguía apareciendo en la home. Peor: el admin no dejaba
--    destildarlo porque el checkbox se deshabilita en productos inactivos.
--    La baja llega de varios lados (ficha del admin y sync del ERP, que apaga
--    todo lo que dejó de venir en el feed), así que la regla va en un trigger
--    y no repetida en cada lugar que escribe `activo`.
--
-- 2) La estrella es por foto, así que un producto con 5 fotos destacadas salía
--    5 veces en el slider. La estrella pasa a ser "la foto de portada": una
--    sola por producto, garantizada por índice único parcial.

-- Limpieza previa: bajar la estrella de todo producto inactivo.
update producto_fotos f
   set destacada = false
  from productos p
 where p.id = f.producto_id
   and f.destacada
   and p.activo is not true;

-- Limpieza previa: dejar una sola destacada por producto (la de menor orden).
with ranking as (
  select id,
         row_number() over (partition by producto_id order by orden, id) as pos
    from producto_fotos
   where destacada
)
update producto_fotos f
   set destacada = false
  from ranking r
 where r.id = f.id
   and r.pos > 1;

create unique index if not exists producto_fotos_una_destacada_por_producto
  on producto_fotos (producto_id)
  where destacada;

create or replace function productos_destildar_destacadas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.activo is not true then
    update producto_fotos
       set destacada = false
     where producto_id = new.id
       and destacada;
  end if;
  return new;
end;
$$;

revoke all on function productos_destildar_destacadas() from public, anon, authenticated;

drop trigger if exists trg_productos_destildar_destacadas on productos;
create trigger trg_productos_destildar_destacadas
after update of activo on productos
for each row
when (new.activo is distinct from old.activo)
execute function productos_destildar_destacadas();
