do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.profiles'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%intention%';
  if constraint_name is not null then
    execute format('alter table public.profiles drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.profiles
  add constraint profiles_intention_check check (
    intention is null or intention = any (array['sleep','focus','relax','meditate','study','unwind','rain','nature','travel','calm'])
  );

alter table public.profiles
  add column if not exists onboarding_done boolean not null default false;

update public.profiles set onboarding_done = true;

create table if not exists public.profile_picks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  track_id text not null references public.tracks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

alter table public.profile_picks enable row level security;

drop policy if exists picks_own on public.profile_picks;
create policy picks_own on public.profile_picks
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select, insert, update, delete on public.profile_picks to authenticated;

insert into public.countries (code, name, display_currency, charge_currency, local_web_methods, card_networks)
values
  ('SE', 'Sweden', 'USD', 'NGN', false, array['visa','mastercard','amex']),
  ('NO', 'Norway', 'USD', 'NGN', false, array['visa','mastercard','amex']),
  ('DK', 'Denmark', 'USD', 'NGN', false, array['visa','mastercard','amex']),
  ('FI', 'Finland', 'USD', 'NGN', false, array['visa','mastercard','amex']),
  ('PL', 'Poland', 'USD', 'NGN', false, array['visa','mastercard','amex']),
  ('BE', 'Belgium', 'USD', 'NGN', false, array['visa','mastercard','amex']),
  ('CH', 'Switzerland', 'USD', 'NGN', false, array['visa','mastercard','amex']),
  ('AT', 'Austria', 'USD', 'NGN', false, array['visa','mastercard','amex']),
  ('GR', 'Greece', 'USD', 'NGN', false, array['visa','mastercard','amex']),
  ('RO', 'Romania', 'USD', 'NGN', false, array['visa','mastercard','amex']),
  ('MA', 'Morocco', 'USD', 'NGN', false, array['visa','mastercard','amex']),
  ('TN', 'Tunisia', 'USD', 'NGN', false, array['visa','mastercard','amex']),
  ('ET', 'Ethiopia', 'USD', 'NGN', false, array['visa','mastercard','amex']),
  ('BW', 'Botswana', 'USD', 'NGN', false, array['visa','mastercard','amex']),
  ('KR', 'South Korea', 'USD', 'NGN', false, array['visa','mastercard','amex']),
  ('CN', 'China', 'USD', 'NGN', false, array['visa','mastercard','amex']),
  ('MY', 'Malaysia', 'USD', 'NGN', false, array['visa','mastercard','amex']),
  ('PH', 'Philippines', 'USD', 'NGN', false, array['visa','mastercard','amex']),
  ('ID', 'Indonesia', 'USD', 'NGN', false, array['visa','mastercard','amex']),
  ('TH', 'Thailand', 'USD', 'NGN', false, array['visa','mastercard','amex']),
  ('AR', 'Argentina', 'USD', 'NGN', false, array['visa','mastercard','amex']),
  ('CO', 'Colombia', 'USD', 'NGN', false, array['visa','mastercard','amex']),
  ('CL', 'Chile', 'USD', 'NGN', false, array['visa','mastercard','amex']),
  ('JM', 'Jamaica', 'USD', 'NGN', false, array['visa','mastercard','amex']),
  ('TR', 'Turkey', 'USD', 'NGN', false, array['visa','mastercard','amex']),
  ('QA', 'Qatar', 'USD', 'NGN', false, array['visa','mastercard','amex'])
on conflict (code) do nothing;
