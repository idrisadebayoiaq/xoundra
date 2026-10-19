alter table public.profiles
  add column if not exists artist_bio text not null default '',
  add column if not exists artist_location text not null default '',
  add column if not exists artist_banner_path text;

alter table public.profiles drop constraint if exists profiles_artist_bio_len;
alter table public.profiles add constraint profiles_artist_bio_len check (char_length(artist_bio) <= 280);
alter table public.profiles drop constraint if exists profiles_artist_location_len;
alter table public.profiles add constraint profiles_artist_location_len check (char_length(artist_location) <= 80);

create table if not exists public.artist_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  artist_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, artist_id),
  constraint artist_follows_not_self check (follower_id <> artist_id)
);

create index if not exists artist_follows_artist_idx on public.artist_follows (artist_id);
create index if not exists tracks_artist_idx on public.tracks (artist_id);

alter table public.artist_follows enable row level security;

drop policy if exists artist_follows_read on public.artist_follows;
create policy artist_follows_read on public.artist_follows
for select to anon, authenticated
using (true);

drop policy if exists artist_follows_insert on public.artist_follows;
create policy artist_follows_insert on public.artist_follows
for insert to authenticated
with check (follower_id = auth.uid());

drop policy if exists artist_follows_delete on public.artist_follows;
create policy artist_follows_delete on public.artist_follows
for delete to authenticated
using (follower_id = auth.uid());

grant select on public.artist_follows to anon, authenticated;
grant insert, delete on public.artist_follows to authenticated;

create or replace view public.artists
with (security_invoker = false) as
select
  p.id,
  p.artist_name,
  p.artist_bio,
  p.artist_location,
  p.avatar_path,
  p.artist_banner_path,
  coalesce(f.followers, 0)::int as followers
from public.profiles p
left join (
  select artist_id, count(*)::int as followers
  from public.artist_follows
  group by artist_id
) f on f.artist_id = p.id
where p.is_artist;

grant select on public.artists to anon, authenticated;

create or replace view public.track_comment_counts
with (security_invoker = true) as
select track_id, count(*)::int as comments
from public.track_comments
group by track_id;

grant select on public.track_comment_counts to anon, authenticated;

create or replace function public.save_artist_profile(
  p_name text,
  p_bio text,
  p_location text,
  p_banner_path text default null,
  p_set_banner boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_bio text := btrim(coalesce(p_bio, ''));
  v_location text := btrim(coalesce(p_location, ''));
begin
  if auth.uid() is null then
    raise exception 'sign_in_required';
  end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and is_artist) then
    raise exception 'not_artist';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 40 then
    raise exception 'missing_details';
  end if;
  if char_length(v_bio) > 280 or char_length(v_location) > 80 then
    raise exception 'missing_details';
  end if;
  if p_set_banner and p_banner_path is not null and p_banner_path <> auth.uid()::text || '/banner.jpg' then
    raise exception 'missing_details';
  end if;
  perform set_config('xoundra.artist', 'on', true);
  update public.profiles
  set artist_name = v_name,
      artist_bio = v_bio,
      artist_location = v_location,
      artist_banner_path = case when p_set_banner then p_banner_path else artist_banner_path end
  where id = auth.uid();
end;
$$;

create or replace function public.set_artist_follow(p_artist uuid, p_on boolean)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'sign_in_required';
  end if;
  if p_artist is null or p_artist = auth.uid() then
    raise exception 'not_allowed';
  end if;
  if not exists (select 1 from public.profiles where id = p_artist and is_artist) then
    raise exception 'not_artist';
  end if;
  if p_on then
    insert into public.artist_follows (follower_id, artist_id)
    values (auth.uid(), p_artist)
    on conflict (follower_id, artist_id) do nothing;
  else
    delete from public.artist_follows
    where follower_id = auth.uid() and artist_id = p_artist;
  end if;
  return (select count(*)::int from public.artist_follows where artist_id = p_artist);
end;
$$;

grant execute on function public.save_artist_profile(text, text, text, text, boolean) to authenticated;
grant execute on function public.set_artist_follow(uuid, boolean) to authenticated;
