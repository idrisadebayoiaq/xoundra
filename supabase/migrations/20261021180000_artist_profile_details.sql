alter table public.profiles
  add column if not exists artist_tagline text not null default '',
  add column if not exists artist_focus text not null default '',
  add column if not exists artist_website text not null default '';

alter table public.profiles drop constraint if exists profiles_artist_tagline_len;
alter table public.profiles add constraint profiles_artist_tagline_len check (char_length(artist_tagline) <= 80);
alter table public.profiles drop constraint if exists profiles_artist_focus_len;
alter table public.profiles add constraint profiles_artist_focus_len check (char_length(artist_focus) <= 80);
alter table public.profiles drop constraint if exists profiles_artist_website_len;
alter table public.profiles add constraint profiles_artist_website_len check (char_length(artist_website) <= 200);

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

drop function if exists public.save_artist_profile(text, text, text, text, boolean);

create or replace function public.save_artist_profile(
  p_name text,
  p_bio text,
  p_location text,
  p_banner_path text default null,
  p_set_banner boolean default false,
  p_tagline text default '',
  p_focus text default '',
  p_website text default ''
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
  perform set_config('xoundra.artist', 'on', true);
  update public.profiles
  set artist_name = v_name,
      artist_bio = v_bio,
      artist_location = v_location,
      artist_tagline = v_tagline,
      artist_focus = v_focus,
      artist_website = v_website,
      artist_banner_path = case when p_set_banner then p_banner_path else artist_banner_path end
  where id = auth.uid();
end;
$$;

grant execute on function public.save_artist_profile(text, text, text, text, boolean, text, text, text) to authenticated;
