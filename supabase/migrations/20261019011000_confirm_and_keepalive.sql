create or replace function public.protect_profile_flags()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('xoundra.confirm_email', true), '') = 'on' then
    return new;
  end if;
  if coalesce(auth.role(), '') <> 'service_role' then
    new.email_confirmed := old.email_confirmed;
  end if;
  return new;
end;
$$;

create or replace function public.mark_email_confirmed(p_user uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  was_confirmed boolean;
begin
  select email_confirmed into was_confirmed
  from public.profiles
  where id = p_user;
  perform set_config('xoundra.confirm_email', 'on', true);
  update public.profiles
  set email_confirmed = true
  where id = p_user;
  return coalesce(was_confirmed, false);
end;
$$;

revoke all on function public.mark_email_confirmed(uuid) from public, anon, authenticated;
grant execute on function public.mark_email_confirmed(uuid) to service_role;
grant select, insert, update, delete on public.profiles to service_role;
grant select on public.user_roles, public.entitlements, public.purchases to service_role;

create table if not exists public.project_pulse (
  id integer primary key default 1,
  touched_at timestamptz not null default now(),
  constraint project_pulse_one_row check (id = 1)
);

insert into public.project_pulse (id)
values (1)
on conflict (id) do nothing;

alter table public.project_pulse enable row level security;
revoke all on public.project_pulse from anon, authenticated;

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.touch_project()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.project_pulse set touched_at = now() where id = 1;
  perform net.http_get(url := 'https://mmgezkeemyjxluxcshaz.supabase.co/auth/v1/health');
end;
$$;

revoke all on function public.touch_project() from public, anon, authenticated;

select cron.unschedule(jobid)
from cron.job
where jobname = 'keep-project-awake';

select cron.schedule(
  'keep-project-awake',
  '15 */8 * * *',
  $$select public.touch_project()$$
);
