-- Permitir lectura pública de configuracion (tema/diseño)
-- ThemeProvider necesita leer claves de diseño desde el browser
-- sin importar si el usuario está autenticado o no.
create policy "public_read_configuracion" on public.configuracion
  for select to anon, authenticated
  using (true);
