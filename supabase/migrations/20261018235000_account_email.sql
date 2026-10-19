alter table public.profiles
  add column if not exists avatar_path text,
  add column if not exists email_confirmed boolean not null default false;

create table if not exists public.email_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  purpose text not null check (purpose in ('signup', 'email_old', 'email_new')),
  code_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.email_codes enable row level security;
revoke all on public.email_codes from anon, authenticated;
grant all on table public.email_codes to service_role;

create or replace function public.protect_profile_flags()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    new.email_confirmed := old.email_confirmed;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_flags on public.profiles;
create trigger profiles_protect_flags
  before update on public.profiles
  for each row execute function public.protect_profile_flags();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen text;
begin
  chosen := coalesce(nullif(new.raw_user_meta_data->>'country_code', ''), 'NG');
  if not exists (select 1 from public.countries where code = chosen) then
    chosen := 'NG';
  end if;
  insert into public.profiles (id, first_name, country_code)
  values (new.id, nullif(new.raw_user_meta_data->>'first_name', ''), chosen)
  on conflict (id) do nothing;
  if lower(new.email) = 'xoundra.support@gmail.com' then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.has_active_premium(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.entitlements
    where user_id = p_user
      and status = 'active'
      and (ends_at is null or ends_at > now())
  )
  or exists (
    select 1
    from public.user_roles
    where user_id = p_user
      and role = 'admin'
  );
$$;

create or replace function public.session_is_recent()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.sessions
    where user_id = auth.uid()
      and created_at > now() - interval '24 hours'
  );
$$;

create or replace function public.user_id_for_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = auth, public
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

revoke all on function public.user_id_for_email(text) from public, anon, authenticated;
grant execute on function public.user_id_for_email(text) to service_role;
create or replace function public.user_session_is_recent(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = auth, public
as $$
  select exists (
    select 1
    from auth.sessions
    where user_id = p_user
      and created_at > now() - interval '24 hours'
  );
$$;

revoke all on function public.user_session_is_recent(uuid) from public, anon, authenticated;
grant execute on function public.user_session_is_recent(uuid) to service_role;
grant execute on function public.session_is_recent() to authenticated, service_role;
grant select on public.user_roles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = true,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists avatars_read on storage.objects;
drop policy if exists avatars_insert on storage.objects;
drop policy if exists avatars_update on storage.objects;
drop policy if exists avatars_delete on storage.objects;

create policy avatars_read on storage.objects
for select to anon, authenticated
using (bucket_id = 'avatars');

create policy avatars_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy avatars_update on storage.objects
for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_delete on storage.objects
for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
