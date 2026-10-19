alter table public.profiles
  add column if not exists is_artist boolean not null default false,
  add column if not exists artist_name text;

alter table public.tracks
  add column if not exists artist_id uuid references public.profiles(id),
  add column if not exists artist_name text;

create table if not exists public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  track_id text not null references public.tracks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

create table if not exists public.track_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  track_id text not null references public.tracks(id) on delete cascade,
  body text not null,
  helped text,
  author_name text not null default 'Listener',
  created_at timestamptz not null default now(),
  constraint track_comments_body check (char_length(btrim(body)) between 2 and 280),
  constraint track_comments_helped check (helped is null or helped = any (array['sleep','focus','relax','meditate']))
);

create table if not exists public.track_stats (
  track_id text primary key references public.tracks(id) on delete cascade,
  plays integer not null default 0,
  likes integer not null default 0,
  favorites integer not null default 0
);

insert into public.likes (user_id, track_id, created_at)
select user_id, track_id, created_at from public.favorites
on conflict (user_id, track_id) do nothing;

insert into public.track_stats (track_id, plays, likes, favorites)
select t.id,
  (select count(*)::int from public.listening_history h where h.track_id = t.id),
  (select count(*)::int from public.likes l where l.track_id = t.id),
  (select count(*)::int from public.favorites f where f.track_id = t.id)
from public.tracks t
on conflict (track_id) do update
set plays = excluded.plays,
    likes = excluded.likes,
    favorites = excluded.favorites;

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
  if coalesce(current_setting('xoundra.artist', true), '') <> 'on'
     and coalesce(auth.role(), '') <> 'service_role' then
    new.is_artist := old.is_artist;
    new.artist_name := old.artist_name;
  end if;
  return new;
end;
$$;

create or replace function public.ensure_track_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.track_stats (track_id) values (new.id) on conflict (track_id) do nothing;
  return new;
end;
$$;

drop trigger if exists tracks_stats on public.tracks;
create trigger tracks_stats
after insert on public.tracks
for each row execute function public.ensure_track_stats();

create or replace function public.count_play()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.track_stats (track_id, plays) values (new.track_id, 1)
  on conflict (track_id) do update set plays = public.track_stats.plays + 1;
  return new;
end;
$$;

drop trigger if exists history_counts_play on public.listening_history;
create trigger history_counts_play
after insert on public.listening_history
for each row execute function public.count_play();

create or replace function public.count_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.track_stats (track_id, likes) values (new.track_id, 1)
    on conflict (track_id) do update set likes = public.track_stats.likes + 1;
    return new;
  end if;
  update public.track_stats set likes = greatest(0, likes - 1) where track_id = old.track_id;
  return old;
end;
$$;

drop trigger if exists likes_count on public.likes;
create trigger likes_count
after insert or delete on public.likes
for each row execute function public.count_like();

create or replace function public.count_favorite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.track_stats (track_id, favorites) values (new.track_id, 1)
    on conflict (track_id) do update set favorites = public.track_stats.favorites + 1;
    return new;
  end if;
  update public.track_stats set favorites = greatest(0, favorites - 1) where track_id = old.track_id;
  return old;
end;
$$;

drop trigger if exists favorites_count on public.favorites;
create trigger favorites_count
after insert or delete on public.favorites
for each row execute function public.count_favorite();

create or replace function public.stamp_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  select coalesce(nullif(btrim(first_name), ''), 'Listener')
    into new.author_name
  from public.profiles
  where id = auth.uid();
  new.body := btrim(new.body);
  return new;
end;
$$;

drop trigger if exists comments_stamp on public.track_comments;
create trigger comments_stamp
before insert on public.track_comments
for each row execute function public.stamp_comment();

create or replace function public.become_artist(p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'sign_in_required';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) < 2 then
    raise exception 'missing_details';
  end if;
  perform set_config('xoundra.artist', 'on', true);
  update public.profiles
  set is_artist = true,
      artist_name = btrim(p_name)
  where id = auth.uid();
end;
$$;

create or replace function public.publish_artist_track(
  p_title text,
  p_category text,
  p_duration numeric,
  p_audio_path text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_id text;
  v_art text;
  v_seconds numeric;
begin
  if auth.uid() is null then
    raise exception 'sign_in_required';
  end if;
  select artist_name into v_name
  from public.profiles
  where id = auth.uid() and is_artist;
  if v_name is null then
    raise exception 'not_artist';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) < 2 then
    raise exception 'missing_details';
  end if;
  if not exists (select 1 from public.categories where slug = p_category) then
    raise exception 'missing_details';
  end if;
  if p_audio_path is null
     or p_audio_path not like auth.uid()::text || '/%.mp3' then
    raise exception 'missing_audio';
  end if;
  v_seconds := greatest(1, coalesce(p_duration, 180));
  v_id := trim(both '-' from regexp_replace(lower(btrim(p_title)), '[^a-z0-9]+', '-', 'g'));
  if v_id = '' then
    v_id := 'sound';
  end if;
  v_id := v_id || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  v_art := case p_category
    when 'nature' then 'river.jpg'
    when 'ambient' then 'wind.jpg'
    when 'focus' then 'storm.jpg'
    when 'meditation' then 'underwater.jpg'
    when 'sleep' then 'night.jpg'
    else p_category || '.jpg'
  end;
  insert into public.tracks (
    id, title, category, duration_seconds, access_tier, status, shelf, loop_ok,
    name_source, artwork_path, audio_path, rights_status, downloads_require_premium,
    artist_id, artist_name
  ) values (
    v_id, btrim(p_title), p_category, v_seconds, 'free', 'published', 'explore', true,
    'artist', v_art, p_audio_path, 'artist', true,
    auth.uid(), v_name
  );
  return v_id;
end;
$$;

create or replace view public.comment_signals
with (security_invoker = true) as
select track_id, helped, count(*)::int as total
from public.track_comments
where helped is not null
group by track_id, helped;

alter table public.likes enable row level security;
alter table public.track_comments enable row level security;
alter table public.track_stats enable row level security;

drop policy if exists likes_own on public.likes;
create policy likes_own on public.likes
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists comments_read on public.track_comments;
create policy comments_read on public.track_comments
for select to anon, authenticated
using (
  exists (
    select 1 from public.tracks t
    where t.id = track_id and t.status = 'published'
  )
);

drop policy if exists comments_insert on public.track_comments;
create policy comments_insert on public.track_comments
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists comments_delete on public.track_comments;
create policy comments_delete on public.track_comments
for delete to authenticated
using (user_id = auth.uid());

drop policy if exists stats_read on public.track_stats;
create policy stats_read on public.track_stats
for select to anon, authenticated
using (true);

grant select, insert, delete on public.likes to authenticated;
grant select on public.track_comments to anon, authenticated;
grant insert, delete on public.track_comments to authenticated;
grant select on public.track_stats to anon, authenticated;
grant select on public.comment_signals to anon, authenticated;
grant execute on function public.become_artist(text) to authenticated;
grant execute on function public.publish_artist_track(text, text, numeric, text) to authenticated;

update storage.buckets
set public = true
where id = 'track-audio';

drop policy if exists artist_audio_write on storage.objects;
create policy artist_audio_write on storage.objects
for insert to authenticated
with check (
  bucket_id = 'track-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_artist)
);
