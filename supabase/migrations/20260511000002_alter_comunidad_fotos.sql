ALTER TABLE comunidad_fotos
  ALTER COLUMN url_instagram DROP NOT NULL,
  ALTER COLUMN thumbnail_url SET NOT NULL;
