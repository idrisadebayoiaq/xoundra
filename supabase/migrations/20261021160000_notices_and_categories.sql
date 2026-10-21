alter table public.categories
  add column if not exists artist_id uuid references public.profiles (id) on delete cascade;

create index if not exists categories_artist_idx on public.categories (artist_id);

create or replace function public.create_artist_category(p_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_slug text;
begin
  if auth.uid() is null then
    raise exception 'sign_in_required';
  end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and is_artist) then
    raise exception 'not_artist';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 32 then
    raise exception 'missing_details';
  end if;
  v_slug := trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'));
  if char_length(v_slug) < 2 then
    raise exception 'missing_details';
  end if;
  if exists (
    select 1 from public.categories
    where slug = v_slug and (artist_id is null or artist_id = auth.uid())
  ) then
    return v_slug;
  end if;
  if exists (select 1 from public.categories where slug = v_slug) then
    v_slug := v_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4);
  end if;
  insert into public.categories (slug, name, sort_order, artist_id)
  values (v_slug, v_name, 1000, auth.uid());
  return v_slug;
end;
$$;

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint announcements_title check (char_length(btrim(title)) between 2 and 80),
  constraint announcements_body check (char_length(btrim(body)) between 2 and 2000)
);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  track_id text,
  album_id uuid,
  announcement_id uuid references public.announcements (id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists user_notifications_user_idx
  on public.user_notifications (user_id, created_at desc);

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.user_notifications (id) on delete cascade,
  user_id uuid not null,
  kind text not null,
  title text not null,
  body text not null,
  track_id text,
  album_id uuid,
  announcement_id uuid,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists notification_outbox_pending_idx
  on public.notification_outbox (created_at)
  where sent_at is null;

create table if not exists public.listener_milestones (
  user_id uuid not null references public.profiles (id) on delete cascade,
  artist_id uuid not null references public.profiles (id) on delete cascade,
  month_start date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, artist_id, month_start)
);

alter table public.announcements enable row level security;
alter table public.user_notifications enable row level security;
alter table public.notification_outbox enable row level security;
alter table public.listener_milestones enable row level security;

drop policy if exists announcements_read on public.announcements;
create policy announcements_read on public.announcements
for select to authenticated
using (true);

drop policy if exists notices_read on public.user_notifications;
create policy notices_read on public.user_notifications
for select to authenticated
using (user_id = auth.uid());

grant select on public.announcements, public.user_notifications to authenticated;

create or replace function public.queue_notice(
  p_user uuid,
  p_kind text,
  p_title text,
  p_body text,
  p_track text default null,
  p_album uuid default null,
  p_announcement uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_user is null then
    return;
  end if;
  insert into public.user_notifications (user_id, kind, title, body, track_id, album_id, announcement_id)
  values (p_user, p_kind, left(p_title, 120), left(p_body, 280), p_track, p_album, p_announcement)
  returning id into v_id;
  insert into public.notification_outbox (notification_id, user_id, kind, title, body, track_id, album_id, announcement_id)
  values (v_id, p_user, p_kind, left(p_title, 120), left(p_body, 280), p_track, p_album, p_announcement);
end;
$$;

create or replace function public.notice_person(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(left(split_part(btrim(p.first_name), ' ', 1), 40), ''),
    'Someone'
  )
  from public.profiles p
  where p.id = p_user
  union all
  select 'Someone'
  limit 1;
$$;

create or replace function public.notice_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := public.notice_person(new.follower_id);
begin
  perform public.queue_notice(
    new.artist_id,
    'follow',
    v_name || ' followed you',
    ''
  );
  return new;
end;
$$;

drop trigger if exists artist_follows_notice on public.artist_follows;
create trigger artist_follows_notice
after insert on public.artist_follows
for each row execute function public.notice_follow();

create or replace function public.notice_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_artist uuid;
  v_title text;
  v_name text;
begin
  select artist_id, title into v_artist, v_title
  from public.tracks where id = new.track_id;
  if v_artist is null or v_artist = new.user_id then
    return new;
  end if;
  v_name := public.notice_person(new.user_id);
  perform public.queue_notice(
    v_artist,
    'like',
    v_name || ' liked ' || coalesce(v_title, 'a sound'),
    '',
    new.track_id
  );
  return new;
end;
$$;

drop trigger if exists likes_notice on public.likes;
create trigger likes_notice
after insert on public.likes
for each row execute function public.notice_like();

create or replace function public.notice_favorite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_artist uuid;
  v_title text;
  v_name text;
begin
  select artist_id, title into v_artist, v_title
  from public.tracks where id = new.track_id;
  if v_artist is null or v_artist = new.user_id then
    return new;
  end if;
  v_name := public.notice_person(new.user_id);
  perform public.queue_notice(
    v_artist,
    'favorite',
    v_name || ' saved ' || coalesce(v_title, 'a sound'),
    '',
    new.track_id
  );
  return new;
end;
$$;

drop trigger if exists favorites_notice on public.favorites;
create trigger favorites_notice
after insert on public.favorites
for each row execute function public.notice_favorite();

create or replace function public.notice_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_artist uuid;
  v_title text;
  v_name text;
begin
  select artist_id, title into v_artist, v_title
  from public.tracks where id = new.track_id;
  if v_artist is null or v_artist = new.user_id then
    return new;
  end if;
  v_name := public.notice_person(new.user_id);
  perform public.queue_notice(
    v_artist,
    'note',
    v_name || ' left a note on ' || coalesce(v_title, 'a sound'),
    '',
    new.track_id
  );
  return new;
end;
$$;

drop trigger if exists comments_notice on public.track_comments;
create trigger comments_notice
after insert on public.track_comments
for each row execute function public.notice_comment();

create or replace function public.notice_release()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_follower uuid;
begin
  if new.artist_id is null or new.album_id is not null or new.status <> 'published' then
    return new;
  end if;
  for v_follower in
    select follower_id from public.artist_follows where artist_id = new.artist_id
  loop
    perform public.queue_notice(
      v_follower,
      'release',
      coalesce(new.artist_name, 'An artist') || ' published a sound',
      new.title,
      new.id
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists tracks_release_notice on public.tracks;
create trigger tracks_release_notice
after insert on public.tracks
for each row execute function public.notice_release();

create or replace function public.notice_album()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_follower uuid;
begin
  select artist_name into v_name from public.profiles where id = new.artist_id;
  for v_follower in
    select follower_id from public.artist_follows where artist_id = new.artist_id
  loop
    perform public.queue_notice(
      v_follower,
      'release',
      coalesce(v_name, 'An artist') || ' published an album',
      new.title,
      null,
      new.id
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists albums_release_notice on public.albums;
create trigger albums_release_notice
after insert on public.albums
for each row execute function public.notice_album();

create or replace function public.notice_top_listener()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_artist uuid;
  v_name text;
  v_month date := date_trunc('month', now())::date;
  v_listeners integer := 0;
  v_plays integer := 0;
  v_rank integer := 0;
  v_tied integer := 0;
  v_cutoff integer := 1;
begin
  select artist_id, artist_name into v_artist, v_name
  from public.tracks
  where id = new.track_id and status = 'published';
  if v_artist is null or v_artist = new.user_id then
    return new;
  end if;
  if exists (
    select 1 from public.listener_milestones
    where user_id = new.user_id and artist_id = v_artist and month_start = v_month
  ) then
    return new;
  end if;

  with month_plays as (
    select h.user_id, count(*)::integer as plays
    from public.listening_history h
    join public.tracks t on t.id = h.track_id
    where t.artist_id = v_artist
      and h.played_at >= v_month
      and h.played_at < (v_month + interval '1 month')
    group by h.user_id
  )
  select
    (select count(*)::integer from month_plays),
    coalesce((select plays from month_plays where user_id = new.user_id), 0),
    coalesce((select count(*)::integer from month_plays where plays > coalesce((select plays from month_plays where user_id = new.user_id), 0)), 0) + 1,
    coalesce((select count(*)::integer from month_plays where plays >= coalesce((select plays from month_plays where user_id = new.user_id), 0)), 0)
  into v_listeners, v_plays, v_rank, v_tied;

  if v_listeners < 20 or v_plays < 5 then
    return new;
  end if;
  v_cutoff := greatest(1, ceil(v_listeners * 0.01)::integer);
  if v_rank <= v_cutoff and v_tied <= v_cutoff then
    insert into public.listener_milestones (user_id, artist_id, month_start)
    values (new.user_id, v_artist, v_month)
    on conflict do nothing;
    perform public.queue_notice(
      new.user_id,
      'top_listener',
      'Top listener',
      'You are in the top 1% of listeners for ' || coalesce(v_name, 'this artist') || ' this month.',
      new.track_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists history_top_listener on public.listening_history;
create trigger history_top_listener
after insert on public.listening_history
for each row execute function public.notice_top_listener();

create or replace function public.publish_announcement(p_title text, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text := btrim(coalesce(p_title, ''));
  v_body text := btrim(coalesce(p_body, ''));
  v_id uuid;
  v_user uuid;
begin
  if auth.uid() is null then
    raise exception 'sign_in_required';
  end if;
  if not exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') then
    raise exception 'not_admin';
  end if;
  if char_length(v_title) < 2 or char_length(v_title) > 80 or char_length(v_body) < 2 or char_length(v_body) > 2000 then
    raise exception 'missing_details';
  end if;
  insert into public.announcements (title, body, created_by)
  values (v_title, v_body, auth.uid())
  returning id into v_id;
  for v_user in select id from public.profiles
  loop
    perform public.queue_notice(v_user, 'announcement', v_title, left(v_body, 180), null, null, v_id);
  end loop;
  return v_id;
end;
$$;

create or replace function public.mark_notices_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  update public.user_notifications
  set read_at = now()
  where user_id = auth.uid() and read_at is null;
end;
$$;

create or replace function public.artist_performance(p_days integer)
returns table (
  day date,
  plays integer,
  likes integer,
  favorites integer,
  notes integer,
  follows integer
)
language sql
stable
security definer
set search_path = public
as $$
  with params as (
    select
      least(180, greatest(1, coalesce(p_days, 30))) as span,
      (current_date - (least(180, greatest(1, coalesce(p_days, 30))) - 1))::date as start_on
  ),
  days as (
    select generate_series((select start_on from params), current_date, interval '1 day')::date as day
  ),
  play_days as (
    select (h.played_at at time zone 'utc')::date as day, count(*)::integer as total
    from public.listening_history h
    join public.tracks t on t.id = h.track_id
    where t.artist_id = auth.uid()
      and h.played_at >= (select start_on from params)
    group by 1
  ),
  like_days as (
    select (l.created_at at time zone 'utc')::date as day, count(*)::integer as total
    from public.likes l
    join public.tracks t on t.id = l.track_id
    where t.artist_id = auth.uid()
      and l.created_at >= (select start_on from params)
    group by 1
  ),
  favorite_days as (
    select (f.created_at at time zone 'utc')::date as day, count(*)::integer as total
    from public.favorites f
    join public.tracks t on t.id = f.track_id
    where t.artist_id = auth.uid()
      and f.created_at >= (select start_on from params)
    group by 1
  ),
  note_days as (
    select (c.created_at at time zone 'utc')::date as day, count(*)::integer as total
    from public.track_comments c
    join public.tracks t on t.id = c.track_id
    where t.artist_id = auth.uid()
      and c.created_at >= (select start_on from params)
    group by 1
  ),
  follow_days as (
    select (a.created_at at time zone 'utc')::date as day, count(*)::integer as total
    from public.artist_follows a
    where a.artist_id = auth.uid()
      and a.created_at >= (select start_on from params)
    group by 1
  )
  select
    days.day,
    coalesce(play_days.total, 0),
    coalesce(like_days.total, 0),
    coalesce(favorite_days.total, 0),
    coalesce(note_days.total, 0),
    coalesce(follow_days.total, 0)
  from days
  left join play_days on play_days.day = days.day
  left join like_days on like_days.day = days.day
  left join favorite_days on favorite_days.day = days.day
  left join note_days on note_days.day = days.day
  left join follow_days on follow_days.day = days.day
  where exists (select 1 from public.profiles where id = auth.uid() and is_artist)
  order by days.day;
$$;

revoke all on function public.notice_person(uuid) from public, anon, authenticated;
revoke all on function public.queue_notice(uuid, text, text, text, text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.notice_follow() from public, anon, authenticated;
revoke all on function public.notice_like() from public, anon, authenticated;
revoke all on function public.notice_favorite() from public, anon, authenticated;
revoke all on function public.notice_comment() from public, anon, authenticated;
revoke all on function public.notice_release() from public, anon, authenticated;
revoke all on function public.notice_album() from public, anon, authenticated;
revoke all on function public.notice_top_listener() from public, anon, authenticated;

grant execute on function public.create_artist_category(text) to authenticated;
grant execute on function public.publish_announcement(text, text) to authenticated;
grant execute on function public.mark_notices_read() to authenticated;

create or replace function public.mark_notice_read(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or p_id is null then
    return;
  end if;
  update public.user_notifications
  set read_at = now()
  where id = p_id and user_id = auth.uid() and read_at is null;
end;
$$;

grant execute on function public.mark_notice_read(uuid) to authenticated;
grant execute on function public.artist_performance(integer) to authenticated;
