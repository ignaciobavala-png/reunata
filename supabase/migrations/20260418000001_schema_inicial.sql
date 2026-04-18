-- ============================================================
-- Reunata — Schema inicial
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. PROFILES
-- Extiende auth.users. Un registro por usuario.
-- ────────────────────────────────────────────────────────────
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  rol               text not null check (rol in ('master', 'empleado', 'cliente')),
  nombre            text,
  email             text,
  telefono          text,
  activo            boolean default true,
  -- Solo clientes
  lista_precios     text,
  bonificacion      numeric default 0,
  cuit_dni          text,
  condicion_fiscal  text,
  -- Solo empleados
  empleado_permisos jsonb,
  -- Estado de aprobación (solo clientes)
  aprobado          boolean default false,
  created_at        timestamptz default now()
);

-- Auto-crear profile al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, rol)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'rol', 'cliente')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 2. PRODUCTOS
-- Cache local de api_items.php de Gesu. Se sincroniza por cron.
-- ────────────────────────────────────────────────────────────
create table public.productos (
  id                serial primary key,
  codigo_interno    text unique,
  codigo_barras     text,
  tipo              text,
  titulo            text not null,
  categoria         text,
  sub_categoria     text,
  marca             text,
  proveedor         text,
  stock             integer,
  stock_minimo      integer,
  moneda            text default 'u$s',
  precio_compra     numeric,
  precio_lista1     numeric,
  precio_lista2     numeric,
  precio_lista3     numeric,
  precio_lista4     numeric,
  precio_lista5     numeric,
  iva               numeric,
  descripcion       text,
  palabras_clave    text,
  activo            boolean default true,
  ultima_sync       timestamptz,
  created_at        timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- 3. PRODUCTO_FOTOS
-- Fotos del catálogo, vinculadas a un producto.
-- ────────────────────────────────────────────────────────────
create table public.producto_fotos (
  id          serial primary key,
  producto_id integer references public.productos(id) on delete cascade,
  url         text not null,
  orden       integer default 0,
  created_at  timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- 4. PEDIDOS
-- ────────────────────────────────────────────────────────────
create table public.pedidos (
  id                  uuid primary key default gen_random_uuid(),
  cliente_id          uuid references public.profiles(id),
  empleado_id         uuid references public.profiles(id),
  estado              text default 'borrador' check (estado in (
    'borrador',
    'pendiente_pago',
    'comprobante_subido',
    'pago_confirmado',
    'en_preparacion',
    'enviado',
    'entregado',
    'cancelado'
  )),
  medio_pago          text check (medio_pago in ('transferencia', 'efectivo', 'cheque')),
  referencia_pago     text,
  fecha_pago          timestamptz,
  pago_confirmado_por uuid references public.profiles(id),
  nota_cancelacion    text,
  notas               text,
  total_usd           numeric,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Auto-actualizar updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger pedidos_updated_at
  before update on public.pedidos
  for each row execute procedure public.set_updated_at();

-- ────────────────────────────────────────────────────────────
-- 5. PEDIDO_ITEMS
-- ────────────────────────────────────────────────────────────
create table public.pedido_items (
  id          serial primary key,
  pedido_id   uuid references public.pedidos(id) on delete cascade,
  producto_id integer references public.productos(id),
  cantidad    integer not null check (cantidad > 0),
  precio_unit numeric not null,
  lista_usada text
);

-- ────────────────────────────────────────────────────────────
-- 6. COMPROBANTES
-- Comprobantes de pago subidos por el cliente.
-- ────────────────────────────────────────────────────────────
create table public.comprobantes (
  id        serial primary key,
  pedido_id uuid references public.pedidos(id) on delete cascade,
  url       text not null,
  subido_at timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- 7. CARRUSEL
-- Imágenes de marketing del homepage.
-- ────────────────────────────────────────────────────────────
create table public.carrusel (
  id         serial primary key,
  url        text not null,
  titulo     text,
  orden      integer default 0,
  activo     boolean default true,
  created_at timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- 8. CONTENIDO
-- Textos editables de la página (clave → valor).
-- ────────────────────────────────────────────────────────────
create table public.contenido (
  clave      text primary key,
  valor      text,
  updated_at timestamptz default now()
);

-- Contenido inicial por defecto
insert into public.contenido (clave, valor) values
  ('hero_titulo',      'El mate que te une'),
  ('hero_subtitulo',   'Mates, termos y accesorios seleccionados. Diseño renovado, calidad importada.'),
  ('hero_cta',         'Ver catálogo'),
  ('nosotros_texto',   'Somos Reunata, una empresa argentina especializada en la importación y distribución mayorista de productos para el mate.'),
  ('footer_direccion', ''),
  ('footer_horarios',  ''),
  ('footer_contacto',  '');

-- ────────────────────────────────────────────────────────────
-- 9. CONFIGURACION
-- Ajustes generales del negocio (clave → valor).
-- ────────────────────────────────────────────────────────────
create table public.configuracion (
  clave      text primary key,
  valor      text,
  updated_at timestamptz default now()
);

insert into public.configuracion (clave, valor) values
  ('banco_cbu',               ''),
  ('banco_alias',             ''),
  ('banco_nombre',            ''),
  ('banco_razon_social',      ''),
  ('banco_cuit',              ''),
  ('pedido_monto_minimo',     '0'),
  ('pedido_dias_vencimiento', '3'),
  ('mostrar_precios_ars',     'false'),
  -- Mapeo lista_precios (string de Gesu) → campo en tabla productos
  ('lista_Locales WEB',       'precio_lista5'),
  ('lista_Minorista',         'precio_lista2');

-- ────────────────────────────────────────────────────────────
-- 10. SYNC_LOG
-- Historial de sincronizaciones con la API de Gesu.
-- ────────────────────────────────────────────────────────────
create table public.sync_log (
  id          serial primary key,
  tipo        text check (tipo in ('productos', 'clientes')),
  estado      text check (estado in ('ok', 'error')),
  registros   integer,
  mensaje     text,
  created_at  timestamptz default now()
);
