alter table bagstore_products enable row level security;
alter table bagstore_settings enable row level security;
alter table bagstore_user_logs enable row level security;
alter table profiles enable row level security;

drop policy if exists "products_read_public" on bagstore_products;
create policy "products_read_public"
on bagstore_products
for select
to anon, authenticated
using (true);

drop policy if exists "products_write_staff" on bagstore_products;
create policy "products_write_staff"
on bagstore_products
for all
to authenticated
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'editor')
  )
)
with check (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'editor')
  )
);

drop policy if exists "settings_read_public" on bagstore_settings;
create policy "settings_read_public"
on bagstore_settings
for select
to anon, authenticated
using (true);

drop policy if exists "settings_write_admin" on bagstore_settings;
create policy "settings_write_admin"
on bagstore_settings
for all
to authenticated
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "logs_read_admin" on bagstore_user_logs;
create policy "logs_read_admin"
on bagstore_user_logs
for select
to authenticated
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "logs_write_authenticated" on bagstore_user_logs;
create policy "logs_write_authenticated"
on bagstore_user_logs
for insert
to authenticated
with check (true);

drop policy if exists "logs_delete_admin" on bagstore_user_logs;
create policy "logs_delete_admin"
on bagstore_user_logs
for delete
to authenticated
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);
