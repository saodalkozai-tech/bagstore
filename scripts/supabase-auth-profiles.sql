create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  username text not null unique,
  email text not null default '',
  role text not null default 'viewer' check (role in ('admin', 'editor', 'viewer')),
  avatar text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles_select_for_authenticated"
on profiles
for select
to authenticated
using (true);

create policy "profiles_insert_own_profile"
on profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_own_profile"
on profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    name,
    username,
    email,
    role,
    avatar
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'viewer'),
    coalesce(new.raw_user_meta_data ->> 'avatar', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user_profile();
