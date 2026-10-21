alter table public.profiles
  add column if not exists artist_links jsonb not null default '[]'::jsonb;

alter table public.profiles drop constraint if exists profiles_artist_links_array;
alter table public.profiles add constraint profiles_artist_links_array check (jsonb_typeof(artist_links) = 'array');

create or replace function public.artist_link_ok(p_platform text, p_url text)
returns boolean
language plpgsql
immutable
as $$
declare
  v_host text;
begin
  if p_platform is null or p_url is null or char_length(p_url) > 300 then
    return false;
  end if;
  if p_url !~* '^https://[^[:space:]@]+$' then
    return false;
  end if;
  v_host := lower(split_part(split_part(substring(p_url from 9), '/', 1), ':', 1));
  v_host := regexp_replace(v_host, '^www\.', '');
  return case p_platform
    when 'instagram' then v_host = 'instagram.com' or v_host like '%.instagram.com'
    when 'x' then v_host in ('x.com', 'twitter.com') or v_host like '%.x.com' or v_host like '%.twitter.com'
    when 'tiktok' then v_host = 'tiktok.com' or v_host like '%.tiktok.com'
    when 'youtube' then v_host in ('youtube.com', 'youtu.be', 'music.youtube.com') or v_host like '%.youtube.com' or v_host like '%.youtu.be'
    when 'facebook' then v_host in ('facebook.com', 'fb.com', 'fb.watch') or v_host like '%.facebook.com' or v_host like '%.fb.com' or v_host like '%.fb.watch'
    when 'spotify' then v_host in ('open.spotify.com', 'spotify.com', 'spotify.link') or v_host like '%.spotify.com' or v_host like '%.spotify.link'
    when 'apple' then v_host = 'music.apple.com'
    when 'soundcloud' then v_host in ('soundcloud.com', 'on.soundcloud.com') or v_host like '%.soundcloud.com'
    when 'bandcamp' then v_host = 'bandcamp.com' or v_host like '%.bandcamp.com'
    when 'audiomack' then v_host = 'audiomack.com' or v_host like '%.audiomack.com'
    else false
  end;
end;
$$;

revoke all on function public.artist_link_ok(text, text) from public, anon, authenticated;

drop view if exists public.artists;

create view public.artists
with (security_invoker = false) as
select
  p.id,
  p.artist_name,
  p.artist_bio,
  p.artist_location,
  p.artist_tagline,
  p.artist_focus,
  p.artist_website,
  p.artist_links,
  p.avatar_path,
  p.artist_banner_path,
  coalesce(f.followers, 0)::int as followers,
  coalesce(m.monthly_listeners, 0)::int as monthly_listeners,
  coalesce(s.plays, 0)::int as plays
from public.profiles p
left join (
  select artist_id, count(*)::int as followers
  from public.artist_follows
  group by artist_id
) f on f.artist_id = p.id
left join (
  select t.artist_id, count(distinct h.user_id)::int as monthly_listeners
  from public.listening_history h
  join public.tracks t on t.id = h.track_id
  where t.artist_id is not null
    and h.played_at >= now() - interval '30 days'
  group by t.artist_id
) m on m.artist_id = p.id
left join (
  select t.artist_id, coalesce(sum(st.plays), 0)::int as plays
  from public.tracks t
  left join public.track_stats st on st.track_id = t.id
  where t.artist_id is not null
  group by t.artist_id
) s on s.artist_id = p.id
where p.is_artist;

grant select on public.artists to anon, authenticated;

drop function if exists public.save_artist_profile(text, text, text, text, boolean, text, text, text);

create or replace function public.save_artist_profile(
  p_name text,
  p_bio text,
  p_location text,
  p_banner_path text default null,
  p_set_banner boolean default false,
  p_tagline text default '',
  p_focus text default '',
  p_website text default '',
  p_links jsonb default '[]'::jsonb
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
  v_tagline text := btrim(coalesce(p_tagline, ''));
  v_focus text := btrim(coalesce(p_focus, ''));
  v_website text := btrim(coalesce(p_website, ''));
  v_links jsonb := '[]'::jsonb;
  v_item jsonb;
  v_platform text;
  v_url text;
  v_seen text[] := array[]::text[];
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
  if char_length(v_bio) > 280 or char_length(v_location) > 80 or char_length(v_tagline) > 80 or char_length(v_focus) > 80 or char_length(v_website) > 200 then
    raise exception 'missing_details';
  end if;
  if v_website <> '' and v_website !~* '^https?://[^[:space:]]+\.[^[:space:]]+$' then
    raise exception 'missing_details';
  end if;
  if p_set_banner and p_banner_path is not null and p_banner_path <> auth.uid()::text || '/banner.jpg' then
    raise exception 'missing_details';
  end if;
  if p_links is null or jsonb_typeof(p_links) <> 'array' or jsonb_array_length(p_links) > 10 then
    raise exception 'missing_details';
  end if;
  for v_item in select value from jsonb_array_elements(p_links)
  loop
    v_platform := v_item->>'platform';
    v_url := btrim(coalesce(v_item->>'url', ''));
    if v_platform = any(v_seen) or not public.artist_link_ok(v_platform, v_url) then
      raise exception 'missing_details';
    end if;
    v_seen := v_seen || v_platform;
    v_links := v_links || jsonb_build_array(jsonb_build_object('platform', v_platform, 'url', v_url));
  end loop;
  perform set_config('xoundra.artist', 'on', true);
  update public.profiles
  set artist_name = v_name,
      artist_bio = v_bio,
      artist_location = v_location,
      artist_tagline = v_tagline,
      artist_focus = v_focus,
      artist_website = v_website,
      artist_links = v_links,
      artist_banner_path = case when p_set_banner then p_banner_path else artist_banner_path end
  where id = auth.uid();
end;
$$;

grant execute on function public.save_artist_profile(text, text, text, text, boolean, text, text, text, jsonb) to authenticated;
