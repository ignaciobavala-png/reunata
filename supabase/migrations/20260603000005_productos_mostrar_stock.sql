ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS mostrar_stock boolean NOT NULL DEFAULT false;
