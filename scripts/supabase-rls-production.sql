-- Production RLS template for the current BagStore app schema.
-- This version keeps public reads and restricts direct writes to staff/admin users.
-- For stricter production hardening, move writes to Edge Functions or a backend.

alter table public.bagstore_products enable row level security;
alter table public.bagstore_settings enable row level security;
alter table public.bagstore_user_logs enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "products_read_public" on public.bagstore_products;
drop policy if exists "products_write_staff" on public.bagstore_products;
drop policy if exists "settings_read_public" on public.bagstore_settings;
drop policy if exists "settings_write_admin" on public.bagstore_settings;
drop policy if exists "logs_read_admin" on public.bagstore_user_logs;
drop policy if exists "logs_write_authenticated" on public.bagstore_user_logs;
drop policy if exists "logs_delete_admin" on public.bagstore_user_logs;
drop policy if exists "profiles_select_for_authenticated" on public.profiles;
drop policy if exists "profiles_insert_own_profile" on public.profiles;
drop policy if exists "profiles_update_own_profile" on public.profiles;

create policy "products_read_public"
on public.bagstore_products
for select
to anon, authenticated
using (true);

create policy "products_write_staff"
on public.bagstore_products
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'editor')
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'editor')
  )
);

create policy "settings_read_public"
on public.bagstore_settings
for select
to anon, authenticated
using (true);

create policy "settings_write_admin"
on public.bagstore_settings
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "logs_read_admin"
on public.bagstore_user_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "logs_write_authenticated"
on public.bagstore_user_logs
for insert
to authenticated
with check (true);

create policy "logs_delete_admin"
on public.bagstore_user_logs
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "profiles_select_for_authenticated"
on public.profiles
for select
to authenticated
using (true);

create policy "profiles_insert_own_profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_own_profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
