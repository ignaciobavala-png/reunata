-- Gastón pidió que el canal Emprendedores (mayorista) use la lista de precios
-- minorista (precio_lista5) para "jugar más con los descuentos", manteniendo el
-- comportamiento mayorista (neto, ambas transferencias). El CHECK original ataba
-- mayorista/especial únicamente a precio_lista3; se afloja para permitir también
-- precio_lista5 en esos canales. Minorista sigue atado a precio_lista5.
alter table public.canales drop constraint if exists canales_categoria_lista_precios_check;

alter table public.canales add constraint canales_categoria_lista_precios_check check (
  (categoria_comercial = 'minorista' and lista_precios = 'precio_lista5')
  or (categoria_comercial = any (array['mayorista'::text, 'especial'::text])
      and lista_precios = any (array['precio_lista3'::text, 'precio_lista5'::text]))
);

-- Emprendedores pasa a la lista minorista (mantiene categoria_comercial=mayorista).
update public.canales set lista_precios = 'precio_lista5' where slug = 'emprendedores';
