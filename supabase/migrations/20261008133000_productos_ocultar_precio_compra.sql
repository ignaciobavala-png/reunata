-- precio_compra (costo de GESU) se podía leer con la anon key: la policy
-- public_read_productos deja ver toda fila activa y anon tenía SELECT sobre la
-- tabla entera. Cualquiera con la key pública del sitio podía pedir
-- /rest/v1/productos?select=precio_compra y obtener el costo de todo el catálogo.
--
-- Un REVOKE de una sola columna no alcanza: si el rol tiene SELECT a nivel tabla,
-- el privilegio de tabla cubre todas las columnas. Hay que sacar el de tabla y
-- volver a dar SELECT columna por columna, dejando afuera precio_compra.
--
-- Nadie del sitio lee precio_compra con anon/authenticated: solo lo escribe el
-- sync con service role. Si se agrega una columna nueva a productos, hay que
-- sumarla a este GRANT o no va a ser legible para la tienda.

REVOKE SELECT ON public.productos FROM anon, authenticated;

GRANT SELECT (
  id, codigo_interno, codigo_barras, tipo, titulo, categoria, sub_categoria,
  marca, proveedor, stock, stock_minimo, moneda,
  precio_lista1, precio_lista2, precio_lista3, precio_lista4, precio_lista5,
  iva, descripcion, palabras_clave, activo, ultima_sync, created_at,
  es_novedad, stock_visible, mostrar_stock, alto, ancho, largo, peso,
  enviar_solo, variantes, descripcion_tecnica, atributos
) ON public.productos TO anon, authenticated;
