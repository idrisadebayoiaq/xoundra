create schema if not exists private;

create table if not exists private.app_secrets (
  name text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

revoke all on schema private from public, anon, authenticated;
revoke all on private.app_secrets from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update, delete on private.app_secrets to service_role;

alter table public.profiles
  add column if not exists last_morning_check_in_at timestamptz,
  add column if not exists last_evening_check_in_at timestamptz;

create or replace function private.get_app_secret(p_name text)
returns text
language sql
security definer
set search_path = private
as $$
  select value from private.app_secrets where name = p_name limit 1;
$$;

revoke all on function private.get_app_secret(text) from public, anon, authenticated;
grant execute on function private.get_app_secret(text) to service_role;

create or replace function public.read_app_secret(p_name text)
returns text
language sql
security definer
set search_path = private
as $$
  select value from private.app_secrets where name = p_name limit 1;
$$;

revoke all on function public.read_app_secret(text) from public, anon, authenticated;
grant execute on function public.read_app_secret(text) to service_role;

create or replace function public.invoke_check_in()
returns void
language plpgsql
security definer
set search_path = public, extensions, private
as $$
declare
  secret text;
  endpoint text := 'https://mmgezkeemyjxluxcshaz.supabase.co/functions/v1/check-in';
begin
  secret := private.get_app_secret('CHECK_IN_CRON_SECRET');
  if secret is null or length(secret) < 8 then
    return;
  end if;
  perform net.http_post(
    url := endpoint,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-check-in-secret', secret
    ),
    body := jsonb_build_object('action', 'dispatch', 'min_days', 1)
  );
end;
$$;

create or replace function public.invoke_push_dispatch()
returns void
language plpgsql
security definer
set search_path = public, extensions, private
as $$
declare
  secret text;
  endpoint text := 'https://mmgezkeemyjxluxcshaz.supabase.co/functions/v1/send-push';
begin
  secret := private.get_app_secret('PUSH_DISPATCH_SECRET');
  if secret is null or length(secret) < 8 then
    secret := private.get_app_secret('CHECK_IN_CRON_SECRET');
  end if;
  if secret is null or length(secret) < 8 then
    return;
  end if;
  perform net.http_post(
    url := endpoint,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', secret
    ),
    body := jsonb_build_object('action', 'dispatch')
  );
end;
$$;

revoke all on function public.invoke_check_in() from public, anon, authenticated;
revoke all on function public.invoke_push_dispatch() from public, anon, authenticated;

select cron.unschedule(jobid)
from cron.job
where jobname in ('xoundra-check-in', 'xoundra-push-dispatch');

select cron.schedule(
  'xoundra-check-in',
  '5 * * * *',
  $$select public.invoke_check_in()$$
);

select cron.schedule(
  'xoundra-push-dispatch',
  '*/10 * * * *',
  $$select public.invoke_push_dispatch()$$
);
