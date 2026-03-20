-- ========================================
-- BagStore Supabase schema matching the current app
-- ========================================
-- Execute in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ljxgrubmnviqwtzudnzl/sql/new

create extension if not exists pgcrypto;

-- ========================================
-- Products
-- The app writes products as JSONB in the `data` column.
-- ========================================
create table if not exists public.bagstore_products (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_bagstore_products_updated_at
  on public.bagstore_products (updated_at desc);

-- Optional migration path from an old column-based schema.
alter table if exists public.bagstore_products
  add column if not exists data jsonb;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bagstore_products'
      and column_name = 'name'
  ) then
    execute $sql$
      update public.bagstore_products
      set data = jsonb_build_object(
        'id', id,
        'name', name,
        'price', price,
        'salePrice', sale_price,
        'stock', stock,
        'inStock', coalesce(in_stock, stock > 0),
        'category', category,
        'color', color,
        'deliveryInfo', delivery_info,
        'images', coalesce(to_jsonb(images), '[]'::jsonb),
        'featured', coalesce(featured, false),
        'createdAt', coalesce(created_at::text, now()::text),
        'updatedAt', coalesce(updated_at::text, now()::text)
      )
      where data is null
    $sql$;
  end if;
end $$;

alter table public.bagstore_products
  alter column data set not null;

-- ========================================
-- Store settings
-- ========================================
create table if not exists public.bagstore_settings (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- ========================================
-- User activity logs
-- ========================================
create table if not exists public.bagstore_user_logs (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bagstore_user_logs_created_at
  on public.bagstore_user_logs (created_at desc);

-- ========================================
-- Enable RLS
-- Policies are managed in the dedicated RLS scripts.
-- ========================================
alter table public.bagstore_products enable row level security;
alter table public.bagstore_settings enable row level security;
alter table public.bagstore_user_logs enable row level security;
alter table public.profiles enable row level security;

-- ========================================
-- Helpful seed for settings if missing
-- ========================================
insert into public.bagstore_settings (key, data, updated_at)
values (
  'default',
  jsonb_build_object(
    'storeName', 'متجر الحقائب',
    'storeEmail', 'info@bagstore.com',
    'storePhone', '+9647768397293',
    'whatsapp', '+9647768397293',
    'logoUrl', '',
    'faviconUrl', '',
    'logoHeightNavbar', 48,
    'logoHeightFooter', 80,
    'heroImageUrl', '',
    'heroImageUrls', '[]'::jsonb,
    'heroSlideIntervalSec', 5,
    'facebookUrl', '',
    'instagramUrl', '',
    'tiktokUrl', '',
    'youtubeUrl', '',
    'footerCategories', jsonb_build_array('حقائب يد', 'حقائب كروس'),
    'quickLinks', jsonb_build_array(),
    'cloudinaryCloudName', '',
    'cloudinaryUploadPreset', '',
    'cloudinaryApiKey', '',
    'externalDbEnabled', true,
    'externalDbProvider', 'supabase',
    'externalDbUrl', '',
    'externalDbName', '',
    'externalDbApiKey', '',
    'themePrimaryColor', '#d95f1f',
    'themeAccentColor', '#d95f1f',
    'themeBackgroundColor', '#ffffff',
    'themeForegroundColor', '#1a1a1a',
    'productsPerPage', 12,
    'currency', 'iqd',
    'visitorCount', 0,
    'visitorUniqueCount', 0,
    'visitorDailyStats', '{}'::jsonb,
    'visitorMonthlyStats', '{}'::jsonb,
    'userName', 'admin',
    'userEmail', 'admin@bagstore.com'
  ),
  now()
)
on conflict (key) do nothing;
