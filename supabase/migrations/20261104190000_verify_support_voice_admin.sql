-- Artist verification, support tickets, admin premium grant, voice posts, email outbox

-- Profiles: green verified badge
alter table public.profiles
  add column if not exists artist_verified boolean not null default false;

-- Protect artist_verified from client writes
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
    new.last_check_in_at := old.last_check_in_at;
    new.last_morning_check_in_at := old.last_morning_check_in_at;
    new.last_evening_check_in_at := old.last_evening_check_in_at;
    new.artist_verified := old.artist_verified;
  end if;
  if coalesce(current_setting('xoundra.artist', true), '') <> 'on'
     and coalesce(auth.role(), '') <> 'service_role' then
    new.is_artist := old.is_artist;
    new.artist_name := old.artist_name;
  end if;
  return new;
end;
$$;

create table if not exists public.artist_verification_requests (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.profiles (id) on delete cascade,
  note text not null default '',
  status text not null default 'pending',
  admin_note text not null default '',
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint artist_verification_status check (status in ('pending', 'approved', 'rejected')),
  constraint artist_verification_note check (char_length(note) <= 500),
  constraint artist_verification_admin_note check (char_length(admin_note) <= 800)
);

create unique index if not exists artist_verification_one_pending
  on public.artist_verification_requests (artist_id)
  where status = 'pending';

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null default 'Support',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_tickets_status check (status in ('open', 'answered', 'closed')),
  constraint support_tickets_subject check (char_length(btrim(subject)) between 2 and 120)
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  constraint support_messages_body check (char_length(btrim(body)) between 2 and 4000)
);

create index if not exists support_tickets_user_idx on public.support_tickets (user_id, updated_at desc);
create index if not exists support_tickets_status_idx on public.support_tickets (status, updated_at desc);
create index if not exists support_messages_ticket_idx on public.support_messages (ticket_id, created_at);

-- Voice + flexible Quiet Room body
alter table public.quiet_room_posts
  add column if not exists voice_path text;

alter table public.quiet_room_posts drop constraint if exists quiet_room_posts_body;
alter table public.quiet_room_posts
  alter column body set default '';
alter table public.quiet_room_posts
  add constraint quiet_room_posts_body check (char_length(btrim(body)) <= 500);
alter table public.quiet_room_posts drop constraint if exists quiet_room_posts_content;
alter table public.quiet_room_posts
  add constraint quiet_room_posts_content check (
    char_length(btrim(body)) >= 2
    or cardinality(image_paths) > 0
    or (voice_path is not null and length(btrim(voice_path)) > 0)
  );

alter table public.bulletin_posts
  add column if not exists voice_path text;

alter table public.bulletin_posts drop constraint if exists bulletin_posts_body;
alter table public.bulletin_posts
  alter column body set default '';
alter table public.bulletin_posts
  add constraint bulletin_posts_body check (char_length(btrim(body)) <= 2000);
alter table public.bulletin_posts drop constraint if exists bulletin_posts_content;
alter table public.bulletin_posts
  add constraint bulletin_posts_content check (
    char_length(btrim(body)) >= 1
    or (voice_path is not null and length(btrim(voice_path)) > 0)
  );

-- Email tracking on outbox
alter table public.notification_outbox
  add column if not exists email_sent_at timestamptz;

insert into storage.buckets (id, name, public)
values ('community-voice', 'community-voice', true)
on conflict (id) do nothing;

drop policy if exists community_voice_read on storage.objects;
create policy community_voice_read on storage.objects
for select to public
using (bucket_id = 'community-voice');

drop policy if exists community_voice_insert on storage.objects;
create policy community_voice_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'community-voice'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists community_voice_update on storage.objects;
create policy community_voice_update on storage.objects
for update to authenticated
using (
  bucket_id = 'community-voice'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists community_voice_delete on storage.objects;
create policy community_voice_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'community-voice'
  and (storage.foldername(name))[1] = auth.uid()::text
);

alter table public.artist_verification_requests enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

drop policy if exists artist_verification_read on public.artist_verification_requests;
create policy artist_verification_read on public.artist_verification_requests
for select to authenticated
using (
  artist_id = auth.uid()
  or exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = 'admin')
);

drop policy if exists support_tickets_read on public.support_tickets;
create policy support_tickets_read on public.support_tickets
for select to authenticated
using (
  user_id = auth.uid()
  or exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = 'admin')
);

drop policy if exists support_messages_read on public.support_messages;
create policy support_messages_read on public.support_messages
for select to authenticated
using (
  exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id
      and (
        t.user_id = auth.uid()
        or exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = 'admin')
      )
  )
);

create or replace function public.is_admin_user(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = p_user and role = 'admin'
  );
$$;

create or replace function public.notify_admins(p_kind text, p_title text, p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid;
begin
  for v_admin in select user_id from public.user_roles where role = 'admin' loop
    perform public.queue_notice(v_admin, p_kind, p_title, p_body, null, null, null);
  end loop;
end;
$$;

create or replace function public.apply_artist_verification(p_note text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_artist boolean;
  v_verified boolean;
begin
  if auth.uid() is null then raise exception 'sign_in_required'; end if;
  select is_artist, artist_verified into v_artist, v_verified from public.profiles where id = auth.uid();
  if coalesce(v_artist, false) is not true then raise exception 'not_artist'; end if;
  if coalesce(v_verified, false) then raise exception 'already_verified'; end if;
  if exists (
    select 1 from public.artist_verification_requests
    where artist_id = auth.uid() and status = 'pending'
  ) then raise exception 'already_pending'; end if;

  insert into public.artist_verification_requests (artist_id, note)
  values (auth.uid(), coalesce(btrim(p_note), ''))
  returning id into v_id;

  perform public.notify_admins(
    'verification_request',
    'Verification request',
    'An artist applied for a verified green badge. Review it in Admin.'
  );
  return v_id;
end;
$$;

create or replace function public.admin_review_verification(
  p_request uuid,
  p_approve boolean,
  p_admin_note text default ''
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.artist_verification_requests%rowtype;
  v_name text;
begin
  if auth.uid() is null or not public.is_admin_user() then raise exception 'not_admin'; end if;
  select * into v_row from public.artist_verification_requests where id = p_request;
  if v_row.id is null or v_row.status <> 'pending' then raise exception 'not_found'; end if;

  if p_approve then
    update public.profiles set artist_verified = true where id = v_row.artist_id;
    update public.artist_verification_requests
    set status = 'approved',
        admin_note = coalesce(p_admin_note, ''),
        reviewed_by = auth.uid(),
        reviewed_at = now()
    where id = p_request;
    select coalesce(nullif(btrim(artist_name), ''), nullif(btrim(first_name), ''), 'Artist')
      into v_name from public.profiles where id = v_row.artist_id;
    perform public.queue_notice(
      v_row.artist_id,
      'verification_approved',
      'Congratulations — verified',
      'You obtained a verification badge. Listeners will see your green check. Verified artists stand out on artist pages, can build trust for Bulletins, and stay first in line when creator payouts open.',
      null, null, null
    );
    return true;
  end if;

  update public.artist_verification_requests
  set status = 'rejected',
      admin_note = coalesce(nullif(btrim(p_admin_note), ''), 'Your request was not approved yet.'),
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_request;
  perform public.queue_notice(
    v_row.artist_id,
    'verification_rejected',
    'Verification update',
    'Your verified badge request was not approved. ' || coalesce(nullif(btrim(p_admin_note), ''), 'You can apply again after improving your catalogue.'),
    null, null, null
  );
  return false;
end;
$$;

create or replace function public.admin_grant_premium(
  p_user uuid,
  p_plan text default 'premium_monthly',
  p_days integer default 30
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase uuid;
  v_ends timestamptz;
  v_plan text := coalesce(nullif(p_plan, ''), 'premium_monthly');
begin
  if auth.uid() is null or not public.is_admin_user() then raise exception 'not_admin'; end if;
  if p_user is null then raise exception 'missing_user'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'missing_user'; end if;
  if not exists (select 1 from public.plans where id = v_plan) then
    v_plan := 'premium_monthly';
  end if;

  if v_plan = 'founding_lifetime' or coalesce(p_days, 0) <= 0 then
    v_ends := null;
  else
    v_ends := now() + make_interval(days => greatest(p_days, 1));
  end if;

  insert into public.purchases (
    user_id, plan_id, provider, provider_reference, status, amount_minor, currency
  ) values (
    p_user,
    v_plan,
    'admin_grant',
    'admin-' || gen_random_uuid()::text,
    'success',
    0,
    'USD'
  ) returning id into v_purchase;

  update public.entitlements
  set status = 'cancelled'
  where user_id = p_user and status = 'active' and plan_id <> 'founding_lifetime';

  insert into public.entitlements (user_id, plan_id, purchase_id, status, starts_at, ends_at)
  values (p_user, v_plan, v_purchase, 'active', now(), v_ends);

  perform public.queue_notice(
    p_user,
    'premium_granted',
    'Premium is on',
    'An admin enabled Premium on your account. Enjoy mixes, offline downloads, sleep schedules, and the Guide.',
    null, null, null
  );
  return v_purchase;
end;
$$;

create or replace function public.create_support_ticket(p_message text, p_subject text default 'Support')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket uuid;
  v_subject text := coalesce(nullif(btrim(p_subject), ''), 'Support');
begin
  if auth.uid() is null then raise exception 'sign_in_required'; end if;
  if char_length(btrim(p_message)) < 4 then raise exception 'missing_details'; end if;

  insert into public.support_tickets (user_id, subject)
  values (auth.uid(), left(v_subject, 120))
  returning id into v_ticket;

  insert into public.support_messages (ticket_id, author_id, body, is_admin)
  values (v_ticket, auth.uid(), btrim(p_message), false);

  perform public.notify_admins(
    'support_ticket',
    'New support message',
    'A listener sent a support note. Reply from Admin.'
  );
  return v_ticket;
end;
$$;

create or replace function public.admin_reply_support(p_ticket uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_user uuid;
begin
  if auth.uid() is null or not public.is_admin_user() then raise exception 'not_admin'; end if;
  if char_length(btrim(p_body)) < 2 then raise exception 'missing_details'; end if;
  select user_id into v_user from public.support_tickets where id = p_ticket;
  if v_user is null then raise exception 'not_found'; end if;

  insert into public.support_messages (ticket_id, author_id, body, is_admin)
  values (p_ticket, auth.uid(), btrim(p_body), true)
  returning id into v_id;

  update public.support_tickets
  set status = 'answered', updated_at = now()
  where id = p_ticket;

  perform public.queue_notice(
    v_user,
    'support_reply',
    'Support replied',
    left(btrim(p_body), 180),
    null, null, null
  );
  return v_id;
end;
$$;

create or replace function public.create_quiet_room_post(
  p_body text,
  p_tag text default '',
  p_track text default null,
  p_images text[] default '{}',
  p_voice text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_tag text := coalesce(p_tag, '');
  v_body text := coalesce(btrim(p_body), '');
  v_images text[] := coalesce(p_images, '{}');
  v_voice text := nullif(btrim(coalesce(p_voice, '')), '');
begin
  if auth.uid() is null then raise exception 'sign_in_required'; end if;
  if public.quiet_room_daily_post_count() >= 8 then raise exception 'rate_limited'; end if;
  if v_tag not in ('', 'recommend', 'app_help', 'night', 'focus', 'scene') then v_tag := ''; end if;
  if char_length(v_body) < 2 and cardinality(v_images) = 0 and v_voice is null then
    raise exception 'missing_details';
  end if;
  insert into public.quiet_room_posts (body, tag, track_id, image_paths, voice_path)
  values (v_body, v_tag, nullif(p_track, ''), v_images, v_voice)
  returning id into v_id;
  return v_id;
end;
$$;

grant select on public.artist_verification_requests to authenticated;
grant select on public.support_tickets to authenticated;
grant select on public.support_messages to authenticated;

revoke all on function public.apply_artist_verification(text) from public, anon;
grant execute on function public.apply_artist_verification(text) to authenticated;
revoke all on function public.admin_review_verification(uuid, boolean, text) from public, anon;
grant execute on function public.admin_review_verification(uuid, boolean, text) to authenticated;
revoke all on function public.admin_grant_premium(uuid, text, integer) from public, anon;
grant execute on function public.admin_grant_premium(uuid, text, integer) to authenticated;
revoke all on function public.create_support_ticket(text, text) from public, anon;
grant execute on function public.create_support_ticket(text, text) to authenticated;
revoke all on function public.admin_reply_support(uuid, text) from public, anon;
grant execute on function public.admin_reply_support(uuid, text) to authenticated;
revoke all on function public.create_quiet_room_post(text, text, text, text[], text) from public, anon;
grant execute on function public.create_quiet_room_post(text, text, text, text[], text) to authenticated;
revoke all on function public.is_admin_user(uuid) from public, anon;
grant execute on function public.is_admin_user(uuid) to authenticated;
