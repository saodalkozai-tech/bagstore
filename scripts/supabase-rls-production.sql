-- Production-oriented RLS template for BagStore.
-- Apply after moving write operations to a trusted backend (service role / edge function).
-- This template intentionally blocks direct writes from anonymous clients.

alter table if exists bagstore_products enable row level security;
alter table if exists bagstore_users enable row level security;
alter table if exists bagstore_settings enable row level security;
alter table if exists bagstore_user_logs enable row level security;

drop policy if exists "bagstore_products_anon_all" on bagstore_products;
drop policy if exists "bagstore_users_anon_all" on bagstore_users;
drop policy if exists "bagstore_settings_anon_all" on bagstore_settings;
drop policy if exists "bagstore_user_logs_anon_all" on bagstore_user_logs;

-- Public read access only (optional: tighten to authenticated if desired).
create policy "bagstore_products_read"
on bagstore_products
for select
to anon, authenticated
using (true);

create policy "bagstore_settings_read"
on bagstore_settings
for select
to anon, authenticated
using (true);

-- Writes are restricted to authenticated users only.
-- Replace `authenticated` with role checks tied to JWT claims in your backend auth model.
create policy "bagstore_products_write_auth"
on bagstore_products
for all
to authenticated
using (true)
with check (true);

create policy "bagstore_users_write_auth"
on bagstore_users
for all
to authenticated
using (true)
with check (true);

create policy "bagstore_settings_write_auth"
on bagstore_settings
for all
to authenticated
using (true)
with check (true);

create policy "bagstore_user_logs_write_auth"
on bagstore_user_logs
for all
to authenticated
using (true)
with check (true);
