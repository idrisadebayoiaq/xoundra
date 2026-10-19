create or replace view public.artists
with (security_invoker = false) as
select
  p.id,
  p.artist_name,
  p.artist_bio,
  p.artist_location,
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
