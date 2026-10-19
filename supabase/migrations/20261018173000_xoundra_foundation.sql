-- Xoundra foundation: accounts, catalogue, billing, premium-only downloads.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.countries (
  code text primary key,
  name text not null,
  display_currency text not null,
  charge_currency text not null check (charge_currency in ('NGN', 'USD')),
  local_web_methods boolean not null default false,
  card_networks text[] not null default array['visa', 'mastercard', 'amex']
);

create table public.fx_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency text not null,
  quote_currency text not null,
  rate numeric(18, 6) not null,
  approximate boolean not null default true,
  fetched_at timestamptz not null default now(),
  unique (base_currency, quote_currency)
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  country_code text not null default 'NG' references public.countries (code),
  intention text check (intention in ('sleep', 'focus', 'relax', 'meditate')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  slug text primary key,
  name text not null,
  sort_order integer not null
);

create table public.tracks (
  id text primary key,
  title text not null,
  category text not null references public.categories (slug),
  duration_seconds numeric(10, 1) not null,
  access_tier text not null default 'free' check (access_tier in ('free', 'premium')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  shelf text not null default 'hold' check (shelf in ('home', 'explore', 'hold')),
  loop_ok boolean not null default false,
  name_source text not null default 'metadata',
  artwork_path text,
  audio_path text,
  rights_status text not null default 'unverified',
  downloads_require_premium boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.tracks.downloads_require_premium is
  'Offline download is Premium-only for every track, including Free tracks.';

create table public.track_tags (
  track_id text not null references public.tracks (id) on delete cascade,
  tag text not null,
  primary key (track_id, tag)
);

create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id text not null references public.tracks (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.playlist_tracks (
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  track_id text not null references public.tracks (id) on delete cascade,
  position integer not null,
  primary key (playlist_id, track_id)
);

create table public.listening_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id text not null references public.tracks (id) on delete cascade,
  played_at timestamptz not null default now()
);

create table public.downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id text not null references public.tracks (id) on delete cascade,
  status text not null default 'ready' check (status in ('ready', 'removed')),
  created_at timestamptz not null default now(),
  unique (user_id, track_id)
);

comment on table public.downloads is
  'A row may be created only while the user has an active Premium entitlement.';

create table public.soundscapes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.soundscape_layers (
  id uuid primary key default gen_random_uuid(),
  soundscape_id uuid not null references public.soundscapes (id) on delete cascade,
  track_id text not null references public.tracks (id),
  layer_order integer not null,
  gain numeric(4, 3) not null default 1,
  muted boolean not null default false,
  loop_ok boolean not null default true
);

create table public.plans (
  id text primary key,
  name text not null,
  kind text not null check (kind in ('free', 'subscription', 'lifetime')),
  active boolean not null default true
);

create table public.plan_prices (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null references public.plans (id),
  currency text not null check (currency in ('NGN', 'USD')),
  amount_minor integer not null check (amount_minor >= 0),
  interval text not null check (interval in ('none', 'month', 'year', 'once')),
  paystack_plan_code text,
  unique (plan_id, currency)
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id text not null references public.plans (id),
  provider text not null default 'paystack',
  provider_reference text,
  currency text not null,
  amount_minor integer not null,
  status text not null check (status in ('pending', 'success', 'failed', 'abandoned', 'refunded', 'rejected')),
  card_brand text,
  renew_blocked boolean not null default false,
  country_code text,
  paystack_subscription_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index purchases_provider_reference_key
  on public.purchases (provider, provider_reference)
  where provider_reference is not null;

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id text not null references public.plans (id),
  paystack_subscription_code text not null unique,
  email_token text,
  status text not null,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id text not null references public.plans (id),
  purchase_id uuid not null unique references public.purchases (id),
  status text not null check (status in ('pending', 'active', 'expired', 'cancelled', 'refunded', 'revoked')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lifetime_offers (
  id text primary key,
  cap integer not null check (cap > 0),
  created_at timestamptz not null default now()
);

create table public.lifetime_slots (
  id uuid primary key default gen_random_uuid(),
  offer_id text not null references public.lifetime_offers (id),
  user_id uuid not null references public.profiles (id) on delete cascade,
  purchase_id uuid not null unique references public.purchases (id) on delete cascade,
  status text not null check (status in ('reserved', 'confirmed', 'released')),
  reserved_until timestamptz,
  created_at timestamptz not null default now()
);

create table public.webhook_events (
  id text primary key,
  provider text not null,
  event_type text not null,
  reference text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('admin', 'support', 'moderator', 'finance')),
  primary key (user_id, role)
);

create index entitlements_user_status_idx on public.entitlements (user_id, status);
create index tracks_status_category_idx on public.tracks (status, category);
create index listening_history_user_idx on public.listening_history (user_id, played_at desc);

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger tracks_updated_at before update on public.tracks
for each row execute function public.set_updated_at();
create trigger playlists_updated_at before update on public.playlists
for each row execute function public.set_updated_at();
create trigger soundscapes_updated_at before update on public.soundscapes
for each row execute function public.set_updated_at();
create trigger purchases_updated_at before update on public.purchases
for each row execute function public.set_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions
for each row execute function public.set_updated_at();
create trigger entitlements_updated_at before update on public.entitlements
for each row execute function public.set_updated_at();

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
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

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
  );
$$;

create or replace function public.lifetime_slots_remaining()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select o.cap - count(s.id)::integer
  from public.lifetime_offers o
  left join public.lifetime_slots s
    on s.offer_id = o.id
   and (
     s.status = 'confirmed'
     or (s.status = 'reserved' and s.reserved_until > now())
   )
  where o.id = 'founding'
  group by o.cap;
$$;

create or replace function public.reserve_lifetime_slot(p_user uuid, p_purchase uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  slot uuid;
  offer_cap integer;
  used integer;
begin
  select cap into offer_cap from public.lifetime_offers where id = 'founding' for update;
  if offer_cap is null then
    raise exception 'lifetime_offer_missing';
  end if;
  select count(*) into used
  from public.lifetime_slots
  where offer_id = 'founding'
    and (
      status = 'confirmed'
      or (status = 'reserved' and reserved_until > now())
    );
  if used >= offer_cap then
    raise exception 'sold_out';
  end if;
  insert into public.lifetime_slots (offer_id, user_id, purchase_id, status, reserved_until)
  values ('founding', p_user, p_purchase, 'reserved', now() + interval '20 minutes')
  returning id into slot;
  return slot;
end;
$$;

create or replace function public.release_lifetime_slot(p_purchase uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.lifetime_slots
  set status = 'released', reserved_until = null
  where purchase_id = p_purchase
    and status = 'reserved';
end;
$$;

create or replace function public.confirm_paystack_purchase(
  p_purchase_id uuid,
  p_reference text,
  p_currency text,
  p_amount integer,
  p_brand text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  purchase public.purchases%rowtype;
  price public.plan_prices%rowtype;
  period interval;
  ends_at timestamptz;
  brand_is_amex boolean;
begin
  select * into purchase from public.purchases where id = p_purchase_id for update;
  if not found then
    return 'missing_purchase';
  end if;

  if purchase.status = 'success' and purchase.provider_reference = p_reference then
    return 'duplicate';
  end if;

  select * into price
  from public.plan_prices
  where plan_id = purchase.plan_id
    and currency = p_currency
    and amount_minor = p_amount;

  if not found then
    update public.purchases
    set status = 'rejected', provider_reference = p_reference, card_brand = p_brand
    where id = purchase.id;
    perform public.release_lifetime_slot(purchase.id);
    return 'amount_mismatch';
  end if;

  brand_is_amex := p_brand ilike '%amex%' or p_brand ilike '%american express%';

  update public.purchases
  set status = 'success',
      provider_reference = p_reference,
      currency = p_currency,
      amount_minor = p_amount,
      card_brand = p_brand,
      renew_blocked = brand_is_amex and purchase.plan_id <> 'founding_lifetime'
  where id = purchase.id;

  if purchase.plan_id = 'founding_lifetime' then
    update public.lifetime_slots
    set status = 'confirmed', reserved_until = null
    where purchase_id = purchase.id
      and status = 'reserved';
    ends_at := null;
  else
    period := case price.interval when 'year' then interval '1 year' else interval '1 month' end;
    ends_at := now() + period;
  end if;

  insert into public.entitlements (user_id, plan_id, purchase_id, status, starts_at, ends_at)
  values (purchase.user_id, purchase.plan_id, purchase.id, 'active', now(), ends_at)
  on conflict (purchase_id) do nothing;

  return 'granted';
end;
$$;

create or replace function public.revoke_purchase(p_reference text, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  purchase_id uuid;
begin
  select id into purchase_id
  from public.purchases
  where provider = 'paystack' and provider_reference = p_reference;

  if purchase_id is null then
    return;
  end if;

  update public.purchases set status = p_status where id = purchase_id;
  update public.entitlements
  set status = case when p_status = 'refunded' then 'refunded' else 'revoked' end
  where purchase_id = purchase_id
    and status = 'active';
  update public.lifetime_slots
  set status = 'released', reserved_until = null
  where purchase_id = purchase_id
    and status in ('reserved', 'confirmed');
end;
$$;

revoke all on function public.reserve_lifetime_slot(uuid, uuid) from public, anon, authenticated;
revoke all on function public.release_lifetime_slot(uuid) from public, anon, authenticated;
revoke all on function public.confirm_paystack_purchase(uuid, text, text, integer, text) from public, anon, authenticated;
revoke all on function public.revoke_purchase(text, text) from public, anon, authenticated;
grant execute on function public.reserve_lifetime_slot(uuid, uuid) to service_role;
grant execute on function public.release_lifetime_slot(uuid) to service_role;
grant execute on function public.confirm_paystack_purchase(uuid, text, text, integer, text) to service_role;
grant execute on function public.revoke_purchase(text, text) to service_role;
grant execute on function public.has_active_premium(uuid) to anon, authenticated, service_role;
grant execute on function public.lifetime_slots_remaining() to anon, authenticated, service_role;

alter table public.countries enable row level security;
alter table public.fx_rates enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tracks enable row level security;
alter table public.track_tags enable row level security;
alter table public.favorites enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_tracks enable row level security;
alter table public.listening_history enable row level security;
alter table public.downloads enable row level security;
alter table public.soundscapes enable row level security;
alter table public.soundscape_layers enable row level security;
alter table public.plans enable row level security;
alter table public.plan_prices enable row level security;
alter table public.purchases enable row level security;
alter table public.subscriptions enable row level security;
alter table public.entitlements enable row level security;
alter table public.lifetime_offers enable row level security;
alter table public.lifetime_slots enable row level security;
alter table public.webhook_events enable row level security;
alter table public.user_roles enable row level security;

create policy countries_read on public.countries for select to anon, authenticated using (true);
create policy fx_read on public.fx_rates for select to anon, authenticated using (true);
create policy categories_read on public.categories for select to anon, authenticated using (true);
create policy plans_read on public.plans for select to anon, authenticated using (true);
create policy plan_prices_read on public.plan_prices for select to anon, authenticated using (true);
create policy lifetime_offers_read on public.lifetime_offers for select to anon, authenticated using (true);

create policy tracks_read on public.tracks
for select to anon, authenticated
using (status = 'published');

create policy track_tags_read on public.track_tags
for select to anon, authenticated
using (
  exists (
    select 1 from public.tracks t
    where t.id = track_id and t.status = 'published'
  )
);

create policy profiles_read on public.profiles
for select to authenticated using (id = auth.uid());
create policy profiles_update on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy favorites_all on public.favorites
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy playlists_all on public.playlists
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy playlist_tracks_all on public.playlist_tracks
for all to authenticated
using (
  exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
)
with check (
  exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
);

create policy history_read on public.listening_history
for select to authenticated using (user_id = auth.uid());
create policy history_insert on public.listening_history
for insert to authenticated with check (user_id = auth.uid());

create policy downloads_read on public.downloads
for select to authenticated using (user_id = auth.uid());
create policy downloads_insert on public.downloads
for insert to authenticated
with check (user_id = auth.uid() and public.has_active_premium(auth.uid()));
create policy downloads_delete on public.downloads
for delete to authenticated using (user_id = auth.uid());

create policy soundscapes_read on public.soundscapes
for select to authenticated using (user_id = auth.uid());
create policy soundscapes_insert on public.soundscapes
for insert to authenticated
with check (user_id = auth.uid() and public.has_active_premium(auth.uid()));
create policy soundscapes_update on public.soundscapes
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy soundscapes_delete on public.soundscapes
for delete to authenticated using (user_id = auth.uid());

create policy layers_all on public.soundscape_layers
for all to authenticated
using (
  exists (select 1 from public.soundscapes s where s.id = soundscape_id and s.user_id = auth.uid())
)
with check (
  exists (
    select 1 from public.soundscapes s
    where s.id = soundscape_id
      and s.user_id = auth.uid()
      and public.has_active_premium(auth.uid())
  )
);

create policy purchases_read on public.purchases
for select to authenticated using (user_id = auth.uid());
create policy subscriptions_read on public.subscriptions
for select to authenticated using (user_id = auth.uid());
create policy entitlements_read on public.entitlements
for select to authenticated using (user_id = auth.uid());
create policy roles_read on public.user_roles
for select to authenticated using (user_id = auth.uid());

revoke insert, update, delete on public.purchases from anon, authenticated;
revoke insert, update, delete on public.subscriptions from anon, authenticated;
revoke insert, update, delete on public.entitlements from anon, authenticated;
revoke all on public.webhook_events from anon, authenticated;
revoke all on public.lifetime_slots from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('track-audio', 'track-audio', false, 52428800, array['audio/mpeg', 'audio/mp3']),
  ('artwork', 'artwork', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('artist-evidence', 'artist-evidence', false, 20971520, array['application/pdf', 'image/jpeg', 'image/png', 'audio/mpeg'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy artwork_public_read on storage.objects
for select to anon, authenticated
using (bucket_id = 'artwork');
