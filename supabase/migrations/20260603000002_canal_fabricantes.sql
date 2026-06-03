-- Canal de venta: Fabricantes
-- Mismo comportamiento que Distribuidor (Lista 1, por bulto, con pre-compra)
-- No requiere rol en profiles — solo se usa para asignación de productos desde el panel

INSERT INTO public.canales (slug, nombre, descripcion, lista_precios, ver_por_bulto, ver_por_unidad, acceso_precompra)
VALUES (
  'fabricantes',
  'Fabricantes',
  'Fabricantes con acceso a productos por bulto.',
  'precio_lista1',
  true,
  false,
  true
);
